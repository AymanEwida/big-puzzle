package websocket_handler

import (
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/AymanEwida/big-puzzle/lib/queue"
	"github.com/gorilla/websocket"
)

const (
	pingPeriod = 9 * time.Minute
	pongWait   = 10 * time.Minute
)

type Client struct {
	conn             *websocket.Conn
	send             chan SendMessage
	pendingMessagesa queue.Queue[SendMessage]
	closeOnce        sync.Once
}

func NewClient(conn *websocket.Conn) *Client {
	return &Client{
		conn:             conn,
		send:             make(chan SendMessage, 20),
		pendingMessagesa: queue.NewQueue[SendMessage](),
		closeOnce:        sync.Once{},
	}
}

func (c *Client) ReadPump(h *Hub) {
	defer func() {
		h.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadDeadline(time.Now().Add(pongWait))

	c.conn.SetPingHandler(func(_ string) error {
		c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, messageBytes, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsCloseError(
				err,
				websocket.CloseNormalClosure,
				websocket.CloseGoingAway,
			) {
				log.Println("[Info] client closed connection normally")
			} else {
				log.Printf("[Connection Error] %v\n", err)
			}

			return
		}

		var message Message
		if err := json.Unmarshal(messageBytes, &message); err != nil {
			log.Printf("[Server Error] %v\n", err)

			// TODO: add error message to client

			return
		}

		h.boradcast <- message
	}
}

func (c *Client) WritePump() {
	ticker := time.NewTicker(pingPeriod)
	defer ticker.Stop()

	for {
		select {
		case message, ok := <-c.send:
			if !ok {
				return
			}

			messageBytes, err := json.Marshal(message)
			if err != nil {
				log.Printf("[Server Error] %v\n", err)

				// TODO: add error message to client

				return
			}

			err = c.conn.WriteMessage(websocket.TextMessage, messageBytes)
			if err != nil {
				log.Printf("[Connection Error] %v\n", err)

				return
			}
		case <-ticker.C:
			err := c.conn.WriteMessage(websocket.PingMessage, nil)
			if err != nil {
				log.Printf("[Connection Error] %v\n", err)

				return
			}
		}
	}
}
