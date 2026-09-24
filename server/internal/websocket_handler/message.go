package websocket_handler

type Message struct {
	Message string `json:"message"`
}

type SendMessage struct {
	Message     string `json:"message"`
	LiveClients int    `json:"liveClients"`
}
