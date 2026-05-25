# Lattice memory system

<!-- LATTICE_LANE: 51e7e110-e4a9-4d22-90e9-e2475341456a -->

A `lattice_dashboard_summary` call is injected at session start. Use the result to understand current lanes, open review items, and recent captures before diving into work.

## Active usage patterns

- Before starting a task: call `lattice_search_lane` with the active lane to retrieve relevant prior context.
- When you make a significant decision or discover something non-obvious: call `lattice_capture_add` immediately. Don't wait until the end of the session.
- When the user completes a meaningful unit of work: call `lattice_ingest_execution` with the command and result if it's a build, test run, or migration.
- When the review inbox has open items: surface them to the user early so they can decide whether to address them now.

Do not capture noise. Capture things that would be useful to recall in a future session: architectural decisions, discovered constraints, ideas, and test outcomes.
