package websocket_handler

import (
	"fmt"
	"log"
	"net/http"

	"github.com/gorilla/websocket"
)

type WebsocketHandler struct {
	upgrader websocket.Upgrader
}

func NewWebSocketHandler() WebsocketHandler {
	return WebsocketHandler{
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				origin := r.Header.Get("Origin")

				return origin == "http://localhost:3000"
			},
		},
	}
}

func (wh WebsocketHandler) Handle(w http.ResponseWriter, r *http.Request) {
	conn, err := wh.upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("[Error] %v\n", err)

		return
	}

	for {
		messageType, message, err := conn.ReadMessage()
		if err != nil {
			log.Printf("[Error] %v\n", err)

			return
		}

		fmt.Printf("server received: %s\n", message)

		err = conn.WriteMessage(messageType, message)
		if err != nil {
			log.Printf("[Error] %v\n", err)

			return
		}
	}
}
