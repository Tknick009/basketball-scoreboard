# Basketball Scoreboard Application - Design Guidelines

## Design Approach

**Selected Approach:** Design System (Material Design principles) with professional sports scoreboard aesthetics

**Justification:** This is a utility-focused, real-time game management application requiring clarity, legibility from distance, and operator efficiency. Drawing inspiration from professional sports displays (NBA/NCAA scoreboards) combined with modern web application patterns.

**Key Design Principles:**
- Maximized legibility for distance viewing
- Clear hierarchy between scoreboard display and control panel
- Instant visual feedback for all actions
- Professional sports broadcast aesthetic

## Typography System

**Display/Scoreboard Typography (480×120px):**
- Scores: Bold, tabular numerals, text-8xl/96px (digital scoreboard aesthetic)
- Team Names: All caps, bold, text-lg/18px
- Time/Period Clock: Tabular numerals, text-7xl/72px
- Period Label: Bold, text-3xl/30px
- Fouls/Timeouts: Bold, text-lg/18px
- Possession Arrows: h-12 w-12/48px
- Elam Target Score: text-5xl/48px
- Elam Label/Messages: text-base/16px
- Elam Period: text-lg/18px
- "NO ACTIVE GAME" message: text-3xl/30px

**Control Panel Typography:**
- Section Headers: Bold, 20-24px
- Button Labels: Medium weight, 16-18px (larger buttons for touch-friendly operation)
- Player Names: Regular, 16px
- Stats/Inputs: Tabular numerals, 16-18px

**Font Selection:** Use Google Fonts - Roboto Condensed for displays (sports aesthetic) + Inter for controls (modern UI clarity)

## Layout & Spacing System

**Spacing Primitives:** Tailwind units of 2, 4, 6, and 8 (p-2, p-4, p-6, p-8, etc.)

**Two-View Architecture:**

**1. Public Scoreboard Display (Full-screen optimized)**
- Single viewport layout (100vh) designed for projection/large displays
- Centered scoreboard panel with maximum size utilization
- Persistent display of: Team names (left/right), Scores (prominent center), Time/Period (top center), Fouls (below scores), Possession indicator (arrow/triangle between teams)
- Elam Ending mode: Replace time with "Target: [score]" display

**2. Operator Control Panel (Split-screen desktop layout)**
- Left sidebar (w-80): Team selection, roster management, game setup
- Main content area: Active game controls organized in sections
- Top bar: Game clock controls (start/stop/reset), period selector
- Middle section (grid-cols-2): Team scoring panels side-by-side, each showing roster with quick-action buttons (+1/+2/+3 points, +foul per player)
- Bottom section: Possession toggle, timeout buttons, Elam Ending activation with target score input

## Component Library

**Scoreboard Display Components:**
- **Team Panel:** Large team name header, score display (giant numerals), team fouls counter
- **Game Clock:** Digital-style time display with period indicator
- **Possession Indicator:** Animated arrow/chevron pointing to team with ball
- **Elam Target Display:** Replaces clock with target score and "First to [X]" messaging

**Control Panel Components:**
- **Roster Upload:** File input with drag-drop zone for CSV import, table preview of uploaded players
- **Player Row:** Player name/number + inline action buttons (grouped +1/+2/+3, foul button with counter badge)
- **Score Adjustment:** Large primary buttons for common actions, small icon buttons for corrections (+/-)
- **Clock Controls:** Play/pause toggle button, reset button, period increment/decrement
- **Elam Controls:** Toggle switch to activate mode + number input for target score calculation
- **Team Selector:** Dropdown or radio group to choose active teams from roster

**Data Display:**
- Player stats table: Columns for number, name, points, fouls with clear visual separation
- Team foul totals: Badge-style indicators showing team fouls with bonus threshold highlighting
- Game summary panel: Current period, time remaining, score differential

**Forms & Inputs:**
- Team name inputs: Clean text fields with labels
- Score adjustments: Number inputs with increment/decrement buttons
- File upload: Prominent drop zone with file type guidance (.csv)

**Buttons:**
- Primary actions (scoring): Large touch-friendly buttons (min 48px height), grouped by point value
- Secondary actions (adjustments): Icon buttons with tooltips
- Danger actions (reset): Outlined style with confirmation requirement
- Elam activation: Toggle switch with accompanying target input

## Responsive Behavior

**Desktop (Primary):** Full two-view layout - scoreboard display on one screen/window, control panel on another or split-screen
**Tablet:** Stacked layout - scoreboard display as modal/overlay activated from control panel
**Mobile:** Control panel optimized for portrait, scoreboard display requires landscape orientation with simplified view

## Accessibility

- All interactive controls minimum 44x44px touch targets
- Keyboard shortcuts for common actions (space = play/pause, number keys for scoring)
- High contrast ratios for scoreboard elements (designed for distance viewing)
- Screen reader announcements for score changes
- Focus indicators on all interactive elements

## Animations

**Minimal, purposeful animations only:**
- Score changes: Brief scale pulse on updated numbers (200ms)
- Possession indicator: Smooth transition when switching teams (300ms)
- Elam mode activation: Fade transition from clock to target display (400ms)
- Avoid: Continuous animations, decorative effects, distracting movements during live gameplay

## Images

**No images required** - This is a data-driven utility application. All visual elements are typography, shapes, and UI components.