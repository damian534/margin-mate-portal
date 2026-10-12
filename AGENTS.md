# Architecture rules
- Lead Flow period calculations live in a pure date helper and use Australian financial-year quarters to keep report filtering independently testable.
- Lead Flow PDF exports consume the same filtered buckets and breakdowns as the screen, using the current tenant branding and embedded Poppins fonts to keep coaching documents consistent and printable.
- Post-meeting email editing uses Tiptap with sanitised HTML and Markdown draft storage, preserving compatibility with saved meeting notes while hiding raw formatting from users.
- Client-email generation reads finished notes and current deal/contact data under caller access policies at draft time, keeping internal notes separate and avoiding stale client details.