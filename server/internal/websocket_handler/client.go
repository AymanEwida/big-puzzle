package websocket_handler

import (
	"log"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

const (
	pingPeriod = 9 * time.Minute
	pongWait   = 10 * time.Minute
)

type Client struct {
	conn      *websocket.Conn
	send      chan []byte
	closeOnce sync.Once
}

func NewClient(conn *websocket.Conn) *Client {
	return &Client{
		conn:      conn,
		send:      make(chan []byte, 20),
		closeOnce: sync.Once{},
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
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsCloseError(
				err,
				websocket.CloseNormalClosure,
				websocket.CloseGoingAway,
			) {
				log.Println("[Info] client closed connection normally")
			} else {
				log.Printf("[Error] %v\n", err)
			}

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

			err := c.conn.WriteMessage(websocket.TextMessage, message)
			if err != nil {
				log.Printf("[Error] %v\n", err)

				return
			}
		case <-ticker.C:
			err := c.conn.WriteMessage(websocket.PingMessage, nil)
			if err != nil {
				log.Printf("[Error] %v\n", err)

				return
			}
		}
	}
}
