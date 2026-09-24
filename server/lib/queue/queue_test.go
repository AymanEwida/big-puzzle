package queue

import "testing"

func TestPeek(t *testing.T) {
	q := NewQueue[int]()

	if _, ok := q.Peek(); ok {
		t.Errorf("q.Peek().ok = %v, want = false\n", ok)
	}

	q.Enqueue(1)

	if q.IsEmpty() {
		t.Errorf("q.IsEmpty() = %v, want = false\n", q.IsEmpty())
	}

	actual, ok := q.Peek()
	expected := 1

	if !ok {
		t.Errorf("q.Peek().ok = %v, want = true\n", ok)
	}

	if actual != expected {
		t.Errorf("q.Peek().value = %v, want = %v\n", actual, expected)
	}

	q.Enqueue(2)
	actual, ok = q.Peek()

	if !ok {
		t.Errorf("q.Peek().ok = %v, want = true\n", ok)
	}

	if actual != expected {
		t.Errorf("q.Peek().value = %v, want = %v\n", actual, expected)
	}
}

func TestDequeue(t *testing.T) {
	q := NewQueue[int]()

	if _, ok := q.Dequeue(); ok {
		t.Errorf("q.Dequeue().ok = %v, want = false\n", ok)
	}

	q.Enqueue(1)
	q.Enqueue(2)

	actual, ok := q.Dequeue()
	expected := 1

	if !ok {
		t.Errorf("q.Dequeue().ok = %v, want = true\n", ok)
	}

	if actual != expected {
		t.Errorf("q.Dequeue().value = %v, want = %v\n", actual, expected)
	}

	actual, ok = q.Dequeue()
	expected = 2

	if !ok {
		t.Errorf("q.Dequeue().ok = %v, want = true\n", ok)
	}

	if actual != expected {
		t.Errorf("q.Dequeue().value = %v, want = %v\n", actual, expected)
	}

	if !q.IsEmpty() {
		t.Errorf("q.IsEmpty() = %v, want = true\n", q.IsEmpty())
	}
}
