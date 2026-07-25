---
version: alpha
name: TVoid
description: A cinematic, focused, quietly technical interface for a personal local streaming library.
colors:
  background: "#05060a"
  background-top: "#090b12"
  background-elevated: "#0a0d14"
  panel: "#111522"
  panel-strong: "#171d2d"
  panel-translucent: "rgba(255, 255, 255, 0.045)"
  surface-subtle: "rgba(255, 255, 255, 0.035)"
  surface-interactive: "rgba(255, 255, 255, 0.08)"
  text: "#f8fafc"
  text-soft: "#d8deea"
  text-muted: "#a5adbd"
  white: "#ffffff"
  player-black: "#000000"
  line: "rgba(255, 255, 255, 0.11)"
  line-strong: "rgba(255, 255, 255, 0.18)"
  accent-primary: "#7c6dff"
  accent-secondary: "#11c4e8"
  success: "#35e0a1"
  danger: "#ff5573"
typography:
  display:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "clamp(2.25rem, 7vw, 5.75rem)"
    fontWeight: 700
    lineHeight: 0.94
    letterSpacing: "0em"
  watch-title:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "clamp(1.9rem, 4vw, 3.6rem)"
    fontWeight: 700
    lineHeight: 0.94
    letterSpacing: "0em"
  section-title:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "1.45rem"
    fontWeight: 700
    letterSpacing: "0em"
  body-large:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "1.06rem"
    fontWeight: 400
    lineHeight: 1.65
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.7
  card-title:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "1rem"
    fontWeight: 850
    lineHeight: 1.25
  metadata:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "0.92rem"
    fontWeight: 400
    lineHeight: 1.45
  eyebrow:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "0.76rem"
    fontWeight: 900
    letterSpacing: "0em"
  action:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "1rem"
    fontWeight: 850
  badge:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "0.74rem"
    fontWeight: 850
rounded:
  inset: "7px"
  standard: "8px"
  pill: "999px"
spacing:
  micro: "0.35rem"
  compact: "0.55rem"
  card-padding: "0.65rem"
  content-small: "0.75rem"
  control-x: "1rem"
  row-gap: "1.05rem"
  panel: "1.25rem"
  section-mobile: "2.25rem"
  section: "3rem"
components:
  button-primary:
    textColor: "{colors.white}"
    typography: "{typography.action}"
    rounded: "{rounded.standard}"
    padding: "0 1rem"
    height: "2.75rem"
  button-secondary:
    backgroundColor: "{colors.surface-interactive}"
    textColor: "{colors.text}"
    typography: "{typography.action}"
    rounded: "{rounded.standard}"
    padding: "0 1rem"
    height: "2.75rem"
  navigation-item:
    textColor: "{colors.text-muted}"
    rounded: "{rounded.standard}"
    padding: "0 0.85rem"
    height: "2.25rem"
  navigation-item-active:
    backgroundColor: "{colors.surface-interactive}"
    textColor: "{colors.text}"
    rounded: "{rounded.standard}"
    padding: "0 0.85rem"
    height: "2.25rem"
  continue-card:
    backgroundColor: "{colors.panel-translucent}"
    textColor: "{colors.text}"
    rounded: "{rounded.standard}"
    padding: "{spacing.card-padding}"
  episode-row:
    backgroundColor: "{colors.panel-translucent}"
    textColor: "{colors.text}"
    rounded: "{rounded.standard}"
  status-badge:
    textColor: "{colors.text}"
    typography: "{typography.badge}"
    rounded: "{rounded.pill}"
    padding: "0 0.6rem"
    height: "1.65rem"
---

# Design System: TVoid

## Overview

**Creative North Star: "The Personal Screening Room"**

TVoid is a dark, cinematic interface that makes a private filesystem library feel like a focused personal streaming environment. Near-black foundations keep attention on posters, thumbnails, titles, and playback. Electric Violet and Signal Cyan appear as controlled light sources across actions, progress, selected states, placeholders, and ambient page gradients.

The atmosphere is cinematic, focused, and quietly technical. It is polished without ornamental luxury: system typography, compact framed surfaces, explicit media ratios, restrained borders, and direct Italian labels keep the product understandable. The implementation favors browsing and watching over configuration and must not drift toward media-server administration UI.

**Key Characteristics:**

- Near-black, layered surfaces with cool luminous accents.
- Media artwork is the dominant visual content; interface chrome remains restrained.
- Compact 8px framing, thin translucent borders, and pill-shaped state indicators.
- High-weight, zero-tracking typography with very large fluid titles.
- Horizontal browsing rails on the home surface and dense two-column media rows on detail surfaces.
- Short lift-and-brighten hover motion; no elaborate animation system.
- Graceful, styled fallbacks when artwork or library content is unavailable.

## Colors

The palette is a dark neutral field illuminated by a two-color violet-to-cyan accent system. Semi-transparent white layers create most borders and secondary surfaces instead of introducing additional hues.

### Primary

- **Electric Violet** (`accent-primary`) is the leading interaction color. It begins primary-action and progress gradients, tints the global ambient glow, and marks in-progress episode borders and status surfaces.

### Secondary

- **Signal Cyan** (`accent-secondary`) is the cool endpoint of the accent gradients. It colors eyebrows and episode codes, adds the watch-page glow, and pairs with success green in completed episode progress.

### Semantic

- **Completion Green** (`success`) is reserved for completed episode borders, badges, and progress fills.
- **Danger Pink** (`danger`) exists as a root token but is not used by any implemented component or error state. It is not yet an established visual pattern.

### Neutral

- **Void Background** (`background`) is the page foundation and the deepest branded surface.
- **Top Gradient Black** (`background-top`) softens the upper page region before it settles into the main background.
- **Elevated Background** (`background-elevated`) is defined in the root token set but is not directly referenced by the current stylesheet.
- **Panel Navy** (`panel`) and **Strong Panel Navy** (`panel-strong`) provide media fallbacks and scrollbar contrast.
- **Primary Text** (`text`) carries headings and high-emphasis content; **Soft Text** (`text-soft`) carries hero and description copy; **Muted Text** (`text-muted`) carries metadata and inactive navigation.
- **Soft Line** (`line`) and **Strong Line** (`line-strong`) are translucent white borders used to frame surfaces without separating them from the dark field.
- **Player Black** (`player-black`) belongs only to the video canvas and its immediate shell.

### Named Rules

**The Two-Light Rule.** Prominent interactive color is expressed as Electric Violet moving toward Signal Cyan; do not introduce a third decorative accent into established gradients.

**The Artwork-First Rule.** Accent color supports state and hierarchy but does not replace poster and thumbnail imagery as the main source of visual interest.

**The Unestablished Danger Rule.** Do not infer a pink error system from the unused danger token; the current frontend has no implemented error-color treatment.

## Typography

**Display Font:** Inter with the platform sans-serif stack.

**Body Font:** Inter with the same platform sans-serif stack.

**Character:** A single pragmatic sans-serif family is pushed through scale and unusually heavy numeric weights rather than through font pairing. Large titles feel cinematic; compact metadata and labels feel technical and controlled.

### Hierarchy

- **Display** (`display`): Home hero, series title, movie title, and library-page title. It is fluid, very large, tightly led, and has no added tracking.
- **Watch Title** (`watch-title`): A smaller fluid title used above playback so controls and video remain visible.
- **Section Title** (`section-title`): Home rail headings and season headings.
- **Body Large** (`body-large`): Home hero description with soft color and generous leading.
- **Body** (`body`): Series and movie descriptions; the current implementation allows these lines to span up to 56rem.
- **Card Title** (`card-title`): Strong media names and episode titles. Long values may break anywhere instead of overflowing.
- **Metadata** (`metadata`): Years, viewing state, counts, descriptions beneath cards, and other supporting information.
- **Eyebrow** (`eyebrow`): Uppercase Signal Cyan labels above major titles.
- **Action and Badge** (`action`, `badge`): Dense, high-weight text for buttons, navigation, pills, progress percentages, and status.

### Implementation Notes

- The stylesheet names Inter but does not load or bundle it. Rendering therefore depends on whether Inter is installed; otherwise the first available system sans-serif is used.
- Several weights are nonstandard values such as 750, 820, 850, 900, and 950. Browser and font availability determine whether these are synthesized or rounded to available faces.
- Letter spacing is explicitly zero for display titles, section headings, logo text, eyebrows, and episode codes. Uppercase eyebrows rely on weight and color rather than expanded tracking.

### Named Rules

**The One-Family Rule.** Preserve the single sans-serif stack across display, body, labels, metadata, and controls; hierarchy comes from scale, weight, color, and line height.

**The Weight-Forward Rule.** Interface labels and media titles are intentionally heavy. Do not replace their hierarchy with letter-spaced lightweight typography.

## Layout

TVoid uses a centered fluid shell capped at 1500px. Desktop page content has 5vw side padding, 1.8rem top padding, and 4rem bottom padding. At 900px and below, horizontal page and topbar padding becomes 1rem.

The sticky topbar is 4.5rem high on desktop and 4rem on small screens. It keeps the brand at the left and a compact inline navigation group at the right, with a translucent near-black surface, bottom hairline, and 20px backdrop blur. The navigation does not collapse, wrap, or become a menu at either implemented breakpoint.

### Home

- The featured hero is a framed media surface with a fluid height between 24rem and 34rem. Copy sits at the lower left over a strong left-to-right and bottom-to-top dark image treatment.
- Content sections begin 3rem apart on desktop and 2.25rem apart below 620px.
- Media rails are horizontal CSS grids. Poster items use 12.5–15.5rem columns on desktop, 11–13rem below 900px, and approximately 78vw columns below 620px.
- Continue-watching cards use wider columns: 20–27rem on desktop, 18–22rem below 900px, and the same 78vw mobile behavior.
- Full library views use auto-filling poster grids on larger screens and a fixed two-column grid below 620px.

### Series and Movie Detail

- The detail hero uses a poster column of 11–16rem beside flexible information. Below 900px it narrows to 8–12rem; below 620px it stacks into one column and caps the poster at 13rem.
- Series metadata wraps inline and uses bullet separators. The primary watch action sits beneath the description.
- Movie detail intentionally reuses the series hero structure. Its preview surface is a 14–24rem thumbnail beside copy, narrows below 900px, and stacks below 620px.
- Season tabs remain a horizontally scrolling row at all sizes.

### Episodes and Playback

- Episode rows use a 16:9 thumbnail column of 10–13rem beside flexible content. The image column narrows through the breakpoints but remains beside the text even below 620px, where it becomes 7.5rem.
- The watch header is a horizontal metadata-and-actions row on desktop, becomes a grid below 900px, and loses its border, background, and padding below 620px.
- Watch buttons become full-width below 620px. The video is always full-width and is height-limited relative to the viewport so surrounding controls remain accessible.

### Spacing Behavior

The implementation uses recurring compact values around 0.35rem, 0.55rem, 0.75rem, 1rem, and 1.25rem, with 2.25rem and 3rem for large separation. It is not a strict mathematical spacing scale: multiple nearby one-off values are present, and future documentation must not claim a rigid 4px or 8px system that the CSS does not implement.

### Named Rules

**The Media-Ratio Rule.** Posters remain 2:3 and thumbnails remain 16:9 across layouts and fallbacks.

**The Browse-Sideways Rule.** Home collections remain horizontal rails; full library pages use grids; detail-page episodes use rows.

**The Two-Breakpoint Rule.** Preserve the implemented structural changes at 900px and 620px unless a dedicated responsive redesign replaces them.

## Elevation & Depth

The elevation philosophy is ambient and layered. Large destination surfaces—the home hero, detail hero, poster art, continue card, and player—use soft black shadows with wide blur, while ordinary panels rely mainly on translucent fills and 1px borders. Background gradients provide atmospheric depth without competing with artwork.

### Shadow Vocabulary

- **Primary Ambient Shadow** (`0 24px 60px rgba(0, 0, 0, 0.42)`): Home hero, series/movie detail hero, and player shell.
- **Poster Shadow** (`0 16px 38px rgba(0, 0, 0, 0.28)`): Poster frames in browsing grids and rails.
- **Detail Poster Shadow** (`0 22px 48px rgba(0, 0, 0, 0.34)`): The larger poster inside detail heroes.
- **Continue Shadow** (`0 18px 44px rgba(0, 0, 0, 0.18)`): Continue-watching cards.
- **Logo Glow** (`0 12px 28px rgba(17, 196, 232, 0.18)`): The compact violet-to-cyan logo mark.

Hover depth is kinetic rather than shadow-based. Poster and continue cards lift 5px, brighten, and reveal a subtle outline over 180ms. Episode rows, season tabs, and buttons lift 2px over 160ms, with component-specific border, background, or brightness changes.

### Named Rules

**The Ambient-Not-Stacked Rule.** Reserve large shadows for destination surfaces and media objects; ordinary panels stay close to the background through tonal fill and border.

**The Short-Lift Rule.** Hover feedback is a brief upward translation with restrained brightness or border change, not spring motion, scale zoom, or long animation.

## Shapes

The form language is compact, framed, and quietly tactile. Most rectangular surfaces and controls use the standard 8px radius with a 1px translucent border. The logo mark and inner placeholder frame use a closely related 7px radius. Progress bars, badges, and status pills use fully rounded 999px ends.

Artwork and video are clipped to their containers. Rectangular framing stays consistent across heroes, posters, thumbnails, episode rows, tab controls, buttons, empty states, and the player shell. Empty states differ through a dashed border rather than a different silhouette.

### Named Rules

**The Eight-Pixel Frame Rule.** Use the shared 8px corner treatment for established rectangular components; do not introduce a second large-card radius.

**The Pill-for-State Rule.** Full rounding belongs to progress tracks, compact badges, and short state labels—not to general cards or primary containers.

## Components

### Navbar

- A sticky, blurred topbar frames the logo and three navigation links.
- The logo is heavy text paired with a 2rem square gradient mark containing the letter “T.” No separate image asset is used.
- Navigation is muted by default. Hover and page-active states share the same translucent white background and switch text to the primary text color.
- The watch page intentionally has no active navigation item. On the movie detail page, the Film link is active even though its href points to the home-page film anchor.
- Mobile reduces height, logo size, link padding, and page gutters, but does not replace the navigation with a menu.

### Home Hero

- With media available, artwork fills the surface behind layered dark gradients. Copy remains lower-left and is capped at 42rem.
- The content priority is eyebrow, large media title, soft description, then one gradient primary action.
- Without featured media, the same framed gradient panel remains but contains only the static TVoid introduction; there is no empty-state illustration.
- Below 900px the image scrim becomes more uniformly dark to protect copy contrast; below 620px the hero and copy padding shrink.

### Detail Heroes

- Series and movie pages share one poster-and-copy hero pattern. The movie-specific class has no additional styling.
- Poster fallback text remains beneath the image and becomes visible when failed images are removed.
- Metadata is a wrapping inline list; description and primary viewing action follow below.

### Media Cards

- Poster cards use a 2:3 framed image above title and optional year. A bottom black shine overlays the artwork.
- Home poster cards may include a slim inset progress bar near the bottom. Completed items omit this progress marker rather than showing 100%.
- Continue-watching cards are wider, framed 16:9 compositions with a percentage badge over the image, a “Riprendi” pill, title and episode metadata, and a full-width progress bar.
- Poster and continue cards share the 5px lift, brightness increase, and subtle outline hover treatment.
- The stylesheet includes hover styling for an `episode-card` selector, but the JavaScript does not render that class. Actual episode entries use the separate episode-row pattern.

### Episode Rows and Season Tabs

- Season tabs are compact horizontally scrolling buttons. Inactive tabs use muted text and a translucent panel; the active tab uses the violet-to-cyan gradient and white text.
- Episode rows use a 16:9 thumbnail, episode code, title, optional status pill, progress track, and numeric progress.
- Unstarted episodes show no status and keep an invisible progress-track placeholder so the row structure remains stable.
- In-progress episodes add a violet border and a violet-tinted status pill with cyan text.
- Completed episodes add a green border, a green-tinted status pill, and a green-to-cyan progress fill forced to 100%.
- Row hover adds a 2px lift, stronger border, and slightly brighter panel fill.

### Progress Bars and Badges

- Progress tracks are approximately one-third of a rem high, fully rounded, and use a translucent white rail.
- Default progress fills run Electric Violet to Signal Cyan. Completed episode fills run Completion Green to Signal Cyan.
- Poster progress is inset over artwork; continue-card and movie-preview progress sits below metadata; episode progress shares a row with a numeric percentage.
- Percentage badges and “Riprendi” pills use a dark translucent background, white text, thin border, and full rounding.
- Movie completion is visually inconsistent with episode completion: the movie preview says “Completato” but retains the ordinary violet-to-cyan progress fill rather than the green completed treatment.

### Buttons

- Buttons are 2.75rem minimum-height inline-flex controls with 1rem horizontal padding, standard radius, heavy text, and a thin border.
- Primary buttons use the violet-to-cyan gradient with white text. Secondary buttons use a translucent white background with primary text.
- Hover lifts buttons by 2px and raises brightness over 160ms.
- Disabled movie actions use 50% opacity and disable pointer events while retaining the primary-button visual structure.
- There is no implemented pressed style and no custom focus-visible rule. Keyboard focus therefore depends on browser defaults; do not describe an accent focus ring as part of the incumbent system.

### Placeholders and Empty States

- Image placeholders inherit the media ratio and use a violet-to-cyan tinted panel background with centered, very heavy text.
- General poster placeholders add an inset 7px translucent frame. Series poster and episode-thumbnail placeholders are simpler centered text treatments without that pseudo-element.
- Failed images are removed by JavaScript so the placeholder underneath becomes visible.
- Empty, loading, and error messages use the same full-width dashed panel with muted text. The messages change, but there is no separate loading animation or error color.

### Player Surface

- The player is a pure-black, strongly framed destination surface with the primary ambient shadow.
- Native HTML5 video controls provide the playback interface; TVoid does not skin those controls.
- The surrounding header supplies the media title, episode or movie metadata, a secondary return action, and an optional primary next-episode action.
- The watch page uses a cyan ambient background glow instead of the default violet glow.

### Current Implementation Inconsistencies

- Inter is declared but not loaded, and several requested numeric weights may not map to real font faces.
- The root contains defined but unused elevated-background and danger tokens.
- Completed episodes receive green visual semantics; completed movies do not.
- Focus and pressed states have no custom visual system, while hover and selected states are explicitly styled.
- The `episode-thumb` class name is used both for the episode-row thumbnail container and for an image inside continue-watching cards. Higher-specificity image rules prevent the main positioning conflict, but the naming is not a clean reusable component boundary.
- The navigation has responsive padding adjustments but no narrow-screen collapse or overflow behavior.
- The spacing vocabulary is coherent in density but not a strict tokenized scale.

## Do's and Don'ts

### Do

- **Do** keep the near-black background, layered navy panels, translucent borders, and artwork-led hierarchy.
- **Do** use Electric Violet and Signal Cyan together for primary actions, selected tabs, default progress, logo color, and media fallbacks where the current components already do so.
- **Do** preserve 2:3 posters, 16:9 thumbnails, and full-width black video surfaces.
- **Do** preserve the 8px rectangular frame and reserve pill rounding for progress and status.
- **Do** keep browsing rails horizontal on the home page, library cards in grids, and episodes in dense thumbnail-and-copy rows.
- **Do** keep missing artwork and empty-library states functional through the established gradient placeholders and dashed panels.
- **Do** record unresolved or inconsistent states as such until a dedicated refinement changes the implementation.

### Don't

- **Don't** redesign the product into a media-server dashboard, administration console, settings-first shell, or dense monitoring UI.
- **Don't** add decorative hues beyond the established accent pair and semantic completion green without an explicit identity change.
- **Don't** replace the single sans-serif hierarchy with an unsupported font pairing or editorial type system.
- **Don't** use oversized rounding, floating glass cards, or pill-shaped general containers; those forms are absent from the implementation.
- **Don't** invent custom focus, pressed, danger, or disabled-state rules and present them as existing visual authority.
- **Don't** silently normalize the green episode-completion treatment and the ordinary movie-completion treatment; their difference is part of the documented current state.
- **Don't** claim a strict spacing scale, a loaded Inter web font, or a mobile navigation pattern that the source does not provide.
