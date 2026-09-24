package queue

import (
	"container/list"
)

type Queue[T any] struct {
	list *list.List
}

func NewQueue[T any]() Queue[T] {
	return Queue[T]{
		list: list.New(),
	}
}

func (q *Queue[T]) Peek() (T, bool) {
	first := q.list.Front()

	if first == nil {
		var zeroVal T
		return zeroVal, false
	}

	return first.Value.(T), true
}

func (q *Queue[T]) Enqueue(value T) {
	q.list.PushBack(value)
}

func (q *Queue[T]) IsEmpty() bool {
	return q.list.Len() == 0
}

func (q *Queue[T]) Dequeue() (T, bool) {
	if q.IsEmpty() {
		var zeroVal T
		return zeroVal, false
	}

	return q.list.Remove(q.list.Front()).(T), true
}
