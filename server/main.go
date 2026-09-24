package main

import (
	"log"
	"net/http"

	"github.com/AymanEwida/big-puzzle/internal/websocket_handler"
)

func main() {
	serveMux := http.NewServeMux()
	websocketHandler := websocket_handler.NewWebSocketHandler()

	serveMux.HandleFunc("GET /ws", websocketHandler.Handle)

	server := http.Server{
		Handler: serveMux,
		Addr:    ":8080",
	}

	log.Println("[Info] Server is listening on port: 8080")

	log.Fatal(server.ListenAndServe())
}
