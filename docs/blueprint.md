# **App Name**: MG30 Studio

## Core Features:

- Web MIDI Connection: Establish and maintain a robust Web MIDI connection with the NUX MG-30, including auto-detection, permission requests, and connection status monitoring.
- Preset Import/Export: Import and export individual or full banks of presets to/from the MG-30, supporting JSON and SysEx formats, with progress tracking and error handling.
- Local Preset Library: Store and manage presets in a local IndexedDB database, with grid and list views, search, filtering, tagging, categorization, and organization features.
- Parameter Editor: A virtual pedalboard interface with a signal chain visualizer and editors for noise gate, compressor, amp, EQ, modulation, delay, and reverb sections, providing real-time MIDI control.
- A/B Comparison: Quickly switch between two memory slots (A/B) to compare settings for making edits more effective.
- SysEx analysis tool: This feature helps determine the content of a SysEx command from NUX by recording the SysEx messages that occur when a particular control is changed on the physical hardware. The AI tool attempts to reverse engineer the commands in order to map them to controls in the app.

## Style Guidelines:

- Primary color: Deep purple (#673AB7) to evoke a professional and sophisticated feel.
- Background color: Dark grey (#212121) for a dark mode theme that reduces eye strain in low-light environments.
- Accent color: Electric violet (#8E24AA) for highlighting active elements and interactive components.
- Body and headline font: 'Inter' for a modern, neutral look, providing excellent readability in both headlines and body text.
- Code font: 'Source Code Pro' for displaying numerical values and MIDI data in a clear, monospaced format.
- Use minimalist icons from Lucide React to represent amp types, effects, and other parameters, ensuring clarity and visual consistency.
- Implement a responsive layout with collapsable sections, a sidebar for navigation, and a top bar for preset management, optimized for desktop and tablet devices.
- Use smooth, subtle animations (60fps) for transitions, loading states, and interactive feedback, enhancing the user experience without being distracting.