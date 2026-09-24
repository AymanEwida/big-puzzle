package websocket_handler

type Hub struct {
	clients    map[*Client]struct{}
	boradcast  chan []byte
	register   chan *Client
	unregister chan *Client
}

func NewHub() *Hub {
	return &Hub{
		clients:    make(map[*Client]struct{}),
		boradcast:  make(chan []byte),
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}
}

func (h *Hub) Register(client *Client) {
	h.register <- client
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.clients[client] = struct{}{}

		case client := <-h.unregister:
			h.unregisterClient(client)

		case message := <-h.boradcast:
			for client := range h.clients {
				client.send <- message
			}
		}
	}
}

func (h *Hub) unregisterClient(client *Client) {
	client.closeOnce.Do(func() {
		delete(h.clients, client)
		close(client.send)
	})
}
