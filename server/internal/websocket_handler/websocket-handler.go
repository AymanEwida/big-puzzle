package websocket_handler

import (
	"log"
	"net/http"

	"github.com/gorilla/websocket"
)

// TODO: test websocket_handler package
type WebsocketHandler struct {
	upgrader websocket.Upgrader
	hub      *Hub
}

func NewWebSocketHandler() WebsocketHandler {
	return WebsocketHandler{
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				origin := r.Header.Get("Origin")

				return origin == "http://localhost:3000"
			},
		},

		hub: NewHub(),
	}
}

func (wh WebsocketHandler) Handle(w http.ResponseWriter, r *http.Request) {
	conn, err := wh.upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("[Connection Error] %v\n", err)

		return
	}

	client := NewClient(conn)

	wh.hub.Register(client)

	go client.WritePump()
	client.ReadPump(wh.hub)
}
