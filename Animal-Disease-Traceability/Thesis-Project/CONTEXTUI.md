# Frontend UI Context - Animal Disease Traceability

This document outlines the architecture, technology stack, and structure for the frontend UI of the Animal Disease Traceability project.

## Technology Stack

The frontend is built using a modern JavaScript stack tailored for building robust, scalable single-page applications.

*   **Core Framework:** [React](https://react.dev/) (v18.3.1)
*   **Build Tool & Dev Server:** [Vite](https://vitejs.dev/)
*   **Routing:** [React Router DOM](https://reactrouter.com/) (v7.9.4) for client-side routing.
*   **Styling:** [Tailwind CSS](https://tailwindcss.com/) (v3.4.18) paired with PostCSS and Autoprefixer for rapid, utility-first UI development.
*   **HTTP Client:** [Axios](https://axios-http.com/) for making requests to the backend APIs.
*   **State & Notifications:** [React Hot Toast](https://react-hot-toast.com/) for flash messages and user notifications.
*   **Data Visualization:** [Chart.js](https://www.chartjs.org/) integrated via `react-chartjs-2` for rendering analytics and data charts.
*   **Maps & Geolocation:** [Leaflet](https://leafletjs.com/) and `react-leaflet` to display tracking coordinates and interactive maps.
*   **QR Codes:** `qrcode.react` to generate scannable QR codes for animal traceability.
*   **Date Utility:** `date-fns` for robust date formatting and manipulation.

## Project Structure

The source code (`src/`) is logically separated by feature and concern:

```
src/
├── assets/         # Static files such as images, icons, and fonts
├── components/     # Reusable UI components
│   ├── charts/     # Data visualization components (Chart.js wrappers)
│   ├── common/     # Shared, generic UI elements (Buttons, Inputs, Modals, Cards)
│   └── layout/     # Structural components (Navbar, Sidebar, Footer, Wrappers)
├── config/         # Application configuration files (Constants, Environment variables setup)
├── pages/          # Top-level route components mapped to different user roles
│   ├── admin/      # Views specific to system administrators
│   ├── auth/       # Authentication views (Login, Registration)
│   ├── farmer/     # Views and dashboards for farmers (Registering animals, updates)
│   ├── public/     # Publicly accessible views (Landing page, open tracking data)
│   └── vet/        # Views for veterinarians (Health records, checkups, clearances)
├── App.jsx         # Main application component and routing configuration
└── main.jsx        # Entry point for rendering the React application
```

## Key Workflows

*   **Role-Based Access Control (RBAC):** The `pages` directory explicitly separates views by user roles (`admin`, `farmer`, `vet`), implying a system where different authenticated actors have distinct capabilities.
*   **Animal Tracking:** Leveraging Leaflet, the UI provides geospatial context to an animal's journey or current location.
*   **QR Code Integration:** Essential for physical-to-digital linkage, enabling users to quickly scan and retrieve an animal's entire history from the blockchain backend.

## Development Scripts

Run the following commands using `npm` from the root directory (`Thesis-Project`):

*   `npm run dev`: Starts the Vite development server with Hot Module Replacement (HMR).
*   `npm run build`: Compiles and optimizes the app for production.
*   `npm run preview`: Previews the production build locally.
*   `npm run lint`: Runs ESLint to check for code quality and formatting issues.

## UI/UX Functions by User Role

The user interface is segmented into distinct portals, each designed with specific UI components and UX flows tailored for different stakeholders. Below is a detailed description of the functionalities available in the application, including the exact screen files mapped to each function.

### 1. Public & General Users
These functions are accessible without logging in and are aimed at public transparency and user onboarding.
*   **Landing Page (`/`, `/home`):** [src/pages/public/LandingPage.jsx](file:///c:/Users/Paulo/Documents/GitHub/Thesis/Animal-Disease-Traceability/Thesis-Project/src/pages/public/LandingPage.jsx) — The primary entry point that introduces the Animal Disease Traceability system, featuring a responsive navigation bar and a mobile-friendly burger menu.
*   **Animal Movement Map (`/animal-movement`):** [src/pages/public/MovementMap.jsx](file:///c:/Users/Paulo/Documents/GitHub/Thesis/Animal-Disease-Traceability/Thesis-Project/src/pages/public/MovementMap.jsx) — A geospatial visualization (using Leaflet) tracking the movement of animals, giving public insight into supply chains and potential disease vectors.
*   **Digital Animal Passport (`/passport/:batchId`):** [src/pages/public/DigitalPassport.jsx](file:///c:/Users/Paulo/Documents/GitHub/Thesis/Animal-Disease-Traceability/Thesis-Project/src/pages/public/DigitalPassport.jsx) — A standalone, scannable view (usually accessed via QR code) displaying the complete verified history, health records, and origins of a specific animal or batch.
*   **Authentication & Onboarding:** Secure authentication flows with form validation and error handling via React Hot Toast notifications.
    *   **Login (`/login`):** [src/pages/auth/Login.jsx](file:///c:/Users/Paulo/Documents/GitHub/Thesis/Animal-Disease-Traceability/Thesis-Project/src/pages/auth/Login.jsx)
    *   **Register (`/register`):** [src/pages/auth/Register.jsx](file:///c:/Users/Paulo/Documents/GitHub/Thesis/Animal-Disease-Traceability/Thesis-Project/src/pages/auth/Register.jsx)
    *   **Forgot Password (`/forgot-password`):** [src/pages/auth/ForgotPassword.jsx](file:///c:/Users/Paulo/Documents/GitHub/Thesis/Animal-Disease-Traceability/Thesis-Project/src/pages/auth/ForgotPassword.jsx)
*   **FAQ (`/faq`):** [src/pages/public/FAQ.jsx](file:///c:/Users/Paulo/Documents/GitHub/Thesis/Animal-Disease-Traceability/Thesis-Project/src/pages/public/FAQ.jsx) — An informational page providing answers to common questions about the traceability system.

### 2. Farmer Portal (`/farmer`)
A dedicated dashboard interface for farmers to manage their livestock and operations efficiently.
*   **My Livestock (`/farmer/livestock`):** [src/pages/farmer/MyLivestock.jsx](file:///c:/Users/Paulo/Documents/GitHub/Thesis/Animal-Disease-Traceability/Thesis-Project/src/pages/farmer/MyLivestock.jsx) — A ledger and data table view of all animals owned by the farmer, allowing them to register new animals to the blockchain.
*   **Logistics (`/farmer/logistics`):** [src/pages/farmer/Logistics.jsx](file:///c:/Users/Paulo/Documents/GitHub/Thesis/Animal-Disease-Traceability/Thesis-Project/src/pages/farmer/Logistics.jsx) — A UI flow for requesting or viewing movement permits for livestock, integrating with transport networks.
*   **Profile (`/farmer/profile`):** [src/pages/farmer/FarmerProfile.jsx](file:///c:/Users/Paulo/Documents/GitHub/Thesis/Animal-Disease-Traceability/Thesis-Project/src/pages/farmer/FarmerProfile.jsx) — Management of farmer credentials, farm details, and contact information.

### 3. Veterinarian Portal (`/vet`)
A specialized, secure interface for health officials to certify animal health and track diseases.
*   **Vet Overview (`/vet/dashboard`):** [src/pages/vet/VetOverview.jsx](file:///c:/Users/Paulo/Documents/GitHub/Thesis/Animal-Disease-Traceability/Thesis-Project/src/pages/vet/VetOverview.jsx) — A high-level summary dashboard of pending health checks, recent clearances, and active alerts.
*   **Health Records (`/vet/health-records`):** [src/pages/vet/HealthRecord.jsx](file:///c:/Users/Paulo/Documents/GitHub/Thesis/Animal-Disease-Traceability/Thesis-Project/src/pages/vet/HealthRecord.jsx) — A form-based interface to log vaccinations, disease tests, and medical history. Submitting this updates the animal's digital passport immutably.
*   **Movement Permits (`/vet/movement-permits`):** [src/pages/vet/MovementPermits.jsx](file:///c:/Users/Paulo/Documents/GitHub/Thesis/Animal-Disease-Traceability/Thesis-Project/src/pages/vet/MovementPermits.jsx) — A review system where vets can approve or reject farmers' logistics requests based on the animal's current health status.
*   **Transaction Logs (`/vet/transactions`):** [src/pages/vet/VetTransactionLogs.jsx](file:///c:/Users/Paulo/Documents/GitHub/Thesis/Animal-Disease-Traceability/Thesis-Project/src/pages/vet/VetTransactionLogs.jsx) — A history view of all health-related entries and actions made by the vet.
*   **Profile (`/vet/profile`):** [src/pages/vet/VetProfile.jsx](file:///c:/Users/Paulo/Documents/GitHub/Thesis/Animal-Disease-Traceability/Thesis-Project/src/pages/vet/VetProfile.jsx) — Vet credentials and clinic information management.
*   **Disease Alert System (`/vet/disease-reporting`):** (Coming Soon) A critical module designed to broadcast outbreak alerts to neighboring farms and admins.

### 4. Admin Portal (`/admin`)
A comprehensive control center for system administrators to oversee the entire network.
*   **Admin Login (`/adminlogin`):** [src/pages/auth/AdminLogin.jsx](file:///c:/Users/Paulo/Documents/GitHub/Thesis/Animal-Disease-Traceability/Thesis-Project/src/pages/auth/AdminLogin.jsx) — A separate, highly secured entry point specifically for administrators.
*   **Admin Overview (`/admin/dashboard`):** [src/pages/admin/AdminOverview.jsx](file:///c:/Users/Paulo/Documents/GitHub/Thesis/Animal-Disease-Traceability/Thesis-Project/src/pages/admin/AdminOverview.jsx) — The main command center displaying system-wide metrics, active nodes, and high-level transaction statistics.
*   **Livestock Database (`/admin/animal-db`):** [src/pages/admin/LivestockDatabase.jsx](file:///c:/Users/Paulo/Documents/GitHub/Thesis/Animal-Disease-Traceability/Thesis-Project/src/pages/admin/LivestockDatabase.jsx) — The master table of all registered animals across all farms in the entire network.
*   **User Management (`/admin/user-management`):** [src/pages/admin/UserManagement.jsx](file:///c:/Users/Paulo/Documents/GitHub/Thesis/Animal-Disease-Traceability/Thesis-Project/src/pages/admin/UserManagement.jsx) — Interface to approve, suspend, or manage the roles of Farmers and Vets in the system.
*   **Transaction Logs (`/admin/transactions`):** [src/pages/admin/TransactionLogs.jsx](file:///c:/Users/Paulo/Documents/GitHub/Thesis/Animal-Disease-Traceability/Thesis-Project/src/pages/admin/TransactionLogs.jsx) — A global ledger view displaying raw, immutable blockchain transactions for transparency and auditing purposes.
*   **Network Visual (`/admin/network`):** [src/pages/admin/NetworkVisual.jsx](file:///c:/Users/Paulo/Documents/GitHub/Thesis/Animal-Disease-Traceability/Thesis-Project/src/pages/admin/NetworkVisual.jsx) — A visual topology or graph of the system's blockchain network (tracking Hyperledger Fabric nodes, peers, and orgs).
*   **Alert System (`/admin/alert`):** [src/pages/admin/AlertSystem.jsx](file:///c:/Users/Paulo/Documents/GitHub/Thesis/Animal-Disease-Traceability/Thesis-Project/src/pages/admin/AlertSystem.jsx) — Global outbreak management UI, allowing admins to declare quarantines and notify the entire network.
*   **Exit Permits (`/admin/exit-permits`):** [src/pages/admin/ExitPermits.jsx](file:///c:/Users/Paulo/Documents/GitHub/Thesis/Animal-Disease-Traceability/Thesis-Project/src/pages/admin/ExitPermits.jsx) — UI for managing final checkpoints for animals leaving the jurisdiction or being processed.
*   **Reports (`/admin/reports`):** [src/pages/admin/Reports.jsx](file:///c:/Users/Paulo/Documents/GitHub/Thesis/Animal-Disease-Traceability/Thesis-Project/src/pages/admin/Reports.jsx) — Exportable, detailed analytical summaries of system health and traceability compliance.
*   **Admin Profile (`/admin/profile`):** [src/pages/admin/AdminProfile.jsx](file:///c:/Users/Paulo/Documents/GitHub/Thesis/Animal-Disease-Traceability/Thesis-Project/src/pages/admin/AdminProfile.jsx) — Admin credentials and system management profile.
