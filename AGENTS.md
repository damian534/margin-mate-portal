# Architecture rules
- Post-meeting email editing uses Tiptap with sanitised HTML and Markdown draft storage, preserving compatibility with saved meeting notes while hiding raw formatting from users.
- Client-email generation reads finished notes and current deal/contact data under caller access policies at draft time, keeping internal notes separate and avoiding stale client details.