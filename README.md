# Acropolis FTL LIMS
*(Food Testing Laboratory Information Management System)*

## Overview
Acropolis FTL LIMS is a specialized Laboratory Information Management System developed specifically for the Food Testing Laboratory at the Acropolis Institute of Pharmaceutical Education and Research (AIPER). Built to handle the rigorous demands of a modern testing facility, this system streamlines the entire lifecycle of sample testing—from client intake and job distribution to the automated, high-fidelity generation of NABL-compliant test reports. 

## Key Features & Capabilities

### Multi-Tiered Role Architecture
Features dedicated dashboards tailored for Lab Heads, Admin Officers, Assistants, and System Administrators. This ensures strict operational boundaries and streamlined, relevant data entry for every department.

### Comprehensive Test Parameter Engine
Manages the complex taxonomy of food testing using a Cascading Parameter Selector. Coupled with strict backend models for Test Methods and Units, it ensures uncompromising standardization across all analytical procedures.

### End-to-End Sample Traceability
Maintains explicit tracking of physical sample custody transfers between departments. Complete with chronological job timelines and immutable system-wide backend audit logs, ensuring full readiness for regulatory audits.

### Advanced Productivity Tools
Includes a global Command Palette for power users to instantly search and navigate jobs via keyboard shortcuts. An integrated real-time notification engine keeps staff immediately informed of pending approvals or critical updates.

### Automated, Compliant Report Generation
Automatically generates pixel-perfect DOCX and PDF test reports based on live system data. It mathematically injects NABL logos, dynamic QR codes, and sequential Unique Lab Report (ULR) numbers into compliance-ready layouts with in-browser previews.

### Built-In Support Loop
Maintains continuous improvement through an in-app bug reporting and feedback mechanism, allowing users to submit issues directly within the platform.

## Technical Architecture & Stack Details

Acropolis FTL LIMS is engineered for extreme performance, real-time interactivity, and reliability using a bleeding-edge technology stack.

### Responsive React Frontend
The client-side interface is a blazing-fast Single Page Application (SPA) driven by React 19 and Vite 8, ensuring highly optimized production builds. To prevent layout thrashing and eliminate redundant network requests, sophisticated request-cancellation caching techniques (via AbortControllers) guarantee zero lag during rapid navigation. It utilizes `fuse.js` for typo-tolerant, instant client-side fuzzy searching, and establishes persistent WebSocket connections via `socket.io-client` for real-time state updates without page reloads.

### Node.js / Express Backend Engine
The core API is powered by Express 5, taking full advantage of native async routing to securely handle business logic and complex validation. Mongoose enforces strict schema typings against MongoDB. For file handling, the backend bypasses vulnerable local file systems entirely; it uses `multer` and `gridfs-stream` to securely chunk and store sensitive files (like signatures and accreditation logos) directly inside the database. Additionally, `winston-mongodb` actively pipes critical API access logs directly into the database for a permanent, tamper-evident audit trail.

### Dynamic Document Rendering System
To meet NABL's strict formatting regulations, the system utilizes a specialized server-side document engine via programmatic `docx` generation. Rather than relying on brittle HTML-to-PDF converters, this engine calculates exact twip/DXA margins, exact percentage-based table widths, and balances inline images mathematically. The frontend then utilizes `docx-preview` and `html2pdf.js` to render these complex blobs natively within the browser canvas, completely eliminating the need to download files just to verify them.

## Technical Achievements

This software was engineered from the ground up to bypass the limitations of typical off-the-shelf LIMS solutions, requiring our team to architect several highly advanced, custom systems:

### Mathematical Document Construction
Standard web-to-PDF libraries lack the precision required for official lab reports. To ensure absolute, millimeter-perfect layouts for NABL compliance, we engineered a programmatic Document Object Model using raw XML and DXA math. By dynamically splitting table cells on the fly and calculating widths in fiftieths of a percent, we bypassed native third-party previewer crashes and guaranteed flawless structural integrity across all devices and printers.

### Concurrent Network Orchestration
Generating and parsing heavy document blobs in real-time creates intense memory overhead and layout thrashing, especially within React 19's concurrent rendering mode. We implemented a sophisticated network orchestration layer using `AbortController` request-cancellation and strict component-mount tracking. This completely eliminates redundant API calls and memory leaks, allowing the UI to gracefully handle rapid, asynchronous user inputs without overlapping renders.

### Hierarchical State Memoization
Food testing taxonomy is incredibly complex and deeply nested, spanning multiple groups, sub-groups, parameters, and distinct testing methods. Managing this state dynamically without causing massive re-render lag required a custom architecture. We built a heavily optimized `CascadingParameterSelector` that utilizes memoized state trees, allowing technicians to drill down through hundreds of parameters instantly without dropping UI frames.

### Secure Asset Streaming
Laboratory accreditations and official signatures require strict security protocols. Instead of saving these vulnerable assets to a standard local file system, we engineered a direct-to-database streaming pipeline. Utilizing `multer` and `gridfs-stream`, sensitive files are securely chunked and stored directly within MongoDB, eliminating unauthorized filesystem access and simplifying server scaling.

### Real-Time Data Synchronization
To eliminate the overhead of traditional HTTP polling, the entire application layer is synchronized via persistent WebSocket connections using `socket.io`. Job status changes, sample transfers, and critical alerts are broadcasted instantaneously to all relevant personnel, ensuring the entire laboratory operates on a unified, real-time data state.
