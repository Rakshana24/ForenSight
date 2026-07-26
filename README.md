# ForenSight

ForenSight is a web application that helps law enforcement investigators search and analyze crime records. It consolidates synthetic case details, perpetrator profiles, and patrol assignments into a single cockpit. The application provides search tools, visual accomplice networks, and analytics charts to help investigators track active cases and identify regional trends.

---

## Features

*   **Conversational Search**: Natural language search for cases, suspects, victims, and officers.
*   **Context-Aware Chat**: Memory tracking that remembers names and IDs during follow-up questions.
*   **Case Summaries**: One-click reports detailing suspects, victims, findings, and case status.
*   **Chronological Timelines**: Event logs compiled from incident registration, arrests, and chargesheets.
*   **Next-Step Recommendations**: Recommended actions and investigation gaps based on case details.
*   **Accomplice Mapping**: Visual network graphs linking repeat offenders and suspect syndicates.
*   **Organized Crime Scoring**: Computes risk levels and confidence ratings for accomplice networks.
*   **Multi-Dimensional Analytics**: Trend, hotspot, cluster, seasonal, and demographic charts.
*   **Case Folder Export**: Formatted PDF downloads of entire conversation transcripts and reports.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Material UI |
| **Backend** | Node.js (Zoho Catalyst Serverless Function) |
| **Database** | Zoho Catalyst Datastore, ZCQL |
| **AI** | Zoho Catalyst QuickML (GLM Chat) |
| **Visualization** | Recharts, React Flow, Dagre |
| **Deployment** | AppSail, API Gateway |

---

## Zoho Catalyst Services

*   **Data Store**: Stores SQL-like tables for cases, suspects, victims, and chat logs.
*   **QuickML**: Exposes the GLM Chat Model used for query intent parsing.
*   **Functions**: Runs Node.js backend routes for search lookups and PDF compilation.
*   **Zia AI**: Transcribes audio inputs (STT) and synthesizes voice replies (TTS).
*   **AppSail**: Hosts the built production frontend React application.
*   **API Gateway**: Exposes secure API endpoints for frontend-backend communication.

---

## Getting Started

1.  **Clone the repository**:
    ```bash
    git clone <repository_url>
    ```
2.  **Install dependencies**:
    ```bash
    cd client && npm install
    cd ../functions/foren_sight_function && npm install
    ```
3.  **Configure environment variables**: Add your `QUICKML_ENDPOINT_URL` and `QUICKML_ORG_ID` keys to `functions/foren_sight_function/.env`.
4.  **Run backend locally**: Run `catalyst serve` in the project root folder.
5.  **Run frontend locally**: Run `npm run dev` inside the `client/` folder.

---

## How to Use

1.  **Open Dashboard**: View KPI indicator summaries and active case statistics.
2.  **Start a New Investigation**: Click the float assistant bubble to launch a chat session.
3.  **Search Case Files**: Input queries (e.g., *"Show details of Case ID 100"*) via text or voice.
4.  **Run AI Analyses**: Select report buttons in the toolbar to generate summaries or timelines.
5.  **Explore Networks**: Open the Relationship Graph to search suspects and view accomplice maps.
6.  **Analyze Crime Patterns**: Open the Analytics page to view geographic hotspots, seasonal crime spikes, and demographic charts.
7.  **Export PDF**: Click the download icon in the chat view to save chat transcripts.

---

## Example Queries

*   *“Show details of Case ID 100”*
*   *“Show details of accused Somashekar Rao”*
*   *“Who investigated his case?”*
*   *“Generate case summary”*
*   *“Generate timeline”*
*   *“Recommend investigation leads”*
---

## License

This project is licensed under the MIT License.
