# Secret Santa

## Table of Contents
- [Project Description](#project-description)
- [Tech Stack](#tech-stack)
- [Getting Started Locally](#getting-started-locally)
- [Available Scripts](#available-scripts)
- [Project Scope](#project-scope)
- [Project Status](#project-status)
- [License](#license)

## Project Description
The "Secret Santa" application is a web-based tool designed to simplify and automate the gift exchange process. Its primary goal, as an MVP (Minimum Viable Product), is to enable users to create gift groups, invite participants, define drawing rules, and conduct the drawing fully automatically and anonymously. The application eliminates the need for manual organization, ensuring confidentiality and fairness, which is especially important for groups organizing remote exchanges. This product is aimed at anyone who wants to organize such an event among family, friends, or co-workers.

It addresses common problems such as:
*   **Lack of anonymity**: Traditional methods often reveal pairs to the organizer.
*   **Logistical challenges**: Coordinating participants, rules (e.g., exclusions), and result delivery is difficult, especially remotely.
*   **Risk of error**: Possibility of self-drawing or rule violations.
*   **Scattered information**: Wish lists are often dispersed across communication channels.

The "Secret Santa" application offers a centralized, automated, and confidential platform to resolve these issues.

## Tech Stack
The project leverages a modern tech stack to deliver a fast, efficient, and interactive user experience with a robust backend.

### Frontend
*   **Astro 5**: For building fast, high-performance web pages and applications with minimal JavaScript.
*   **React 19**: Provides interactivity where dynamic components are required.
*   **TypeScript 5**: Ensures static typing for improved code quality and enhanced IDE support.
*   **Tailwind 4**: For utility-first CSS styling.
*   **Shadcn/ui**: A library of accessible React components used for building the user interface.

### Backend
*   **Supabase**: A comprehensive backend solution providing:
    *   **PostgreSQL Database**: A powerful relational database.
    *   **Backend-as-a-Service (BaaS)**: SDKs available in multiple languages for easy integration.
    *   **Open Source**: Can be hosted locally or on a custom server.
    *   **Built-in User Authentication**: Handles user registration, login, and session management.

### CI/CD and Hosting
*   **GitHub Actions**: For automated Continuous Integration and Continuous Deployment pipelines.
*   **DigitalOcean**: For application hosting via Docker images.

## Getting Started Locally

To get a local copy up and running, follow these simple steps.

### Prerequisites
Make sure you have Node.js installed. The project is configured to use:
*   Node.js `v22.14.0` (as specified in `.nvmrc`)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/paulinaCzekaj/10xdev-project-secret-santa.git
    cd 10xdev-project-secret-santa
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Environment Variables:**
    The project requires environment variables for Supabase configuration (e.g., `SUPABASE_URL`, `SUPABASE_ANON_KEY`). Create a `.env` file in the project root and add the necessary variables. An example `.env.example` might be provided later, but for now, consult Supabase documentation for required keys.

4.  **Run the development server:**
    ```bash
    npm run dev
    ```
    The application will be accessible at `http://localhost:4321`.

## Available Scripts

In the project directory, you can run:

*   `npm run dev`: Starts the development server.
*   `npm run build`: Builds the application for production.
*   `npm run preview`: Previews the production build locally.
*   `npm run astro`: Accesses the Astro CLI for various commands.
*   `npm run lint`: Runs ESLint to check for code quality issues.
*   `npm run lint:fix`: Runs ESLint and attempts to fix any identifiable issues.
*   `npm run format`: Formats the code using Prettier.

## Project Scope

This section outlines the functionalities included and excluded from the Minimum Viable Product (MVP) of the Secret Santa application.

### In Scope (MVP)
*   **Authentication and Account Management**: User registration, login, logout, and password reset functionality.
*   **Group Management (CRUD)**: Create, add/edit participants, edit group parameters (name, budget, end date), and delete groups. The creator is automatically added as a participant.
*   **Drawing Logic**: Ability to define one-way exclusion rules (e.g., "User A cannot draw User B"). Validation prevents drawings if rules make it impossible. Requires a minimum of 3 participants. The drawing process is irreversible.
*   **Results and Wish Lists**:
    *   Confidential access to drawing results for both registered (via login) and unregistered participants (via unique, hard-to-guess links).
    *   Tracking mechanism for unique link openings.
    *   Participants can create and edit a simple text-based wish list, with automatic conversion of URLs to clickable hyperlinks.
    *   Wish list editing is possible until the defined "event end date."
    *   The result screen displays the drawn person's name, their wish list, group name, budget, and the participant's own editable wish list.

### Out of Scope (MVP)
*   **Notification System**: No email or push notifications for group additions, upcoming drawings, or results.
*   **Formal Invitations**: No system for joining groups via links or codes.
*   **Group Chat**: No built-in chat functionality.
*   **Post-Drawing Edits**: No ability to edit a group or redraw after the drawing has concluded.
*   **External Integrations**: No integrations with external services (e.g., Amazon wish lists).
*   **Advanced User Roles**: No co-organizer or other advanced roles.
*   **Multi-currency Support**: Only PLN is supported.
*   **Name-only Result Access**: Access to results solely by name has been excluded in favor of secure unique links.

## Project Status

The Secret Santa project is currently in active development, focusing on delivering a robust and user-friendly Minimum Viable Product (MVP).

### Core Features Implemented ✅

#### Result View System
The application now includes a comprehensive result viewing system that supports both authenticated and anonymous users:

- **Dual Access Modes**: Support for logged-in users (`/groups/:id/result`) and token-based access for unregistered participants (`/results/:token`)
- **Interactive Reveal**: Animated gift box with confetti animation upon first result reveal
- **Wishlist Management**: Real-time collaborative wishlists with autosave functionality and URL auto-linking
- **Security & Privacy**: Encrypted result access with localStorage persistence for reveal states
- **Responsive Design**: Mobile-first approach with full accessibility compliance (WCAG AA)
- **Error Handling**: Comprehensive error states with user-friendly recovery actions

#### User Experience Enhancements
- **Result Discovery**: Engaging animation sequence with gift unwrapping and celebration effects
- **Live Editing**: Debounced autosave (2s) with visual feedback and conflict resolution
- **Smart Linking**: Automatic URL detection and conversion to clickable links in wishlists
- **State Persistence**: localStorage-backed reveal states that persist across sessions

### Success Metrics
*   **Business/Product KPI**: Achieve 100% result views by participants in every completed drawing, tracked via unique link openings and logged-in user access.
*   **User Activation Rate**: Aim for 50% activation, defined as a registered user who has participated in at least one drawing (as a creator or participant).
*   **Academic/Technical**:
    *   Successful completion and positive evaluation of the academic project.
    *   100% functional core user scenarios: from registration, group creation, participant management, rule definition, drawing execution, to correct result display for all participants.
    *   Drawing logic fully covered by unit tests, ensuring correctness (exclusions, no self-drawing).
    *   Configured and operational CI/CD pipeline (e.g., GitHub Actions) to automatically run tests on every push to the repository.

## License
Unspecified. Please refer to the `LICENSE` file in the repository for detailed information once it is available.
