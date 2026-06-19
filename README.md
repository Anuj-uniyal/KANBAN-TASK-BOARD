# KanFlow — Kanban Task Board

A premium, Trello-style Kanban board built with **HTML + CSS + vanilla JavaScript**.

- Drag & drop cards between **To Do → In Progress → Done**
- Create / edit / delete cards
- Mark tasks as **Completed** with confirmation (moves to **Done**)
- **localStorage persistence** (your board stays after refresh)
- Priority, tags, and due dates (with “Overdue” / “Due soon” styling)

## Live behavior

- **Add card**: click the **+ Add** button on any column
- **Edit card**: click the ✎ icon on a card
- **Delete card**: click the 🗑 icon (or “Clear Task”)
- **Complete task**: click **Complete** on cards in **To Do** / **In Progress**
- **Move cards**: drag a card and drop into another column

## Demo data
On the first load (when no saved board exists), the app seeds a small set of example cards.

## Files

- `index.html` — Layout (columns, modals, toasts)
- `style.css` — Styling (dark glassmorphism UI)
- `app.js` — App logic (state, rendering, drag & drop, modals, storage)

## How to run

Because this project is fully static, you can run it by opening `index.html` in a browser.

Example:

```bash
open index.html
```

> If your browser blocks local features due to file permissions, serve it with a simple static server (optional).

## Technical notes

- Board state is stored under:
  - `localStorage['kanflow_board_v2']`
- Card model includes:
  - `id, title, description, priority, tag, due, column, createdAt`

## Keyboard shortcuts

- Press **Esc** to close the active modal(s)
- Press **Ctrl/⌘ + Enter** to save the Create/Edit modal (when open)

## License

MIT (or your preferred license)
