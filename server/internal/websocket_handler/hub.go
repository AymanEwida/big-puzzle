package websocket_handler

type Hub struct {
	clients    map[*Client]struct{}
	boradcast  chan Message
	register   chan *Client
	unregister chan *Client
}

func NewHub() *Hub {
	return &Hub{
		clients:    make(map[*Client]struct{}),
		boradcast:  make(chan Message),
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
				sendMessage := SendMessage{
					Message:     message.Message,
					LiveClients: len(h.clients),
				}

				if len(client.send) == cap(client.send) {
					client.pendingMessagesa.Enqueue(sendMessage)
				} else {
					if client.pendingMessagesa.IsEmpty() {
						client.send <- sendMessage
					} else {
						for len(client.send) < cap(client.send) && !client.pendingMessagesa.IsEmpty() {
							pendingMessage, _ := client.pendingMessagesa.Dequeue()

							client.send <- pendingMessage
						}
					}
				}
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
