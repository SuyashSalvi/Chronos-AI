# Chronos AI

> Explore history as an interconnected world, not a collection of isolated events.

Chronos AI is an AI-powered historical intelligence platform that transforms history into an interactive knowledge graph. Instead of reading isolated Wikipedia articles, users can explore civilizations, people, battles, empires, and events through relationships, timelines, maps, and AI-driven conversations.

---

# Vision

History is deeply interconnected.

Every emperor, civilization, battle, invention, migration, alliance, and revolution influenced countless other events.

Chronos AI aims to become the world's most comprehensive historical exploration platform by combining:

- Structured historical knowledge
- Geographic visualization
- Interactive timelines
- Relationship graphs
- AI-powered historical reasoning
- Scenario simulation
- Alternate history exploration

Rather than asking:

> "Who was Julius Caesar?"

Users should be able to ask:

> "How did Julius Caesar indirectly contribute to the fall of the Western Roman Empire?"

or

> "Show every civilization connected to the Silk Road between 100 BCE and 500 CE."

---

# Features

## Historical Knowledge Graph

Explore:

- Historical figures
- Civilizations
- Kingdoms
- Empires
- Battles
- Wars
- Treaties
- Cities
- Provinces
- Dynasties
- Political institutions

Each entity is enriched with:

- Wikipedia summary
- Wikipedia article
- Thumbnail
- Time period
- Geographic coordinates
- Relationships

---

## Interactive Timeline

Browse historical events chronologically.

Supports filtering by:

- Year range
- Event type
- Search
- Civilization

---

## Historical Map

Interactive world map displaying:

- Empires
- Cities
- Battles
- Events
- Historical locations

---

## Relationship Graph

Explore connections between historical entities.

Examples:

```
Julius Caesar
      │
      ├── Roman Republic
      │
      ├── Augustus
      │
      ├── Pompey
      │
      └── Roman Civil War
```

Supports:

- Neighbors
- Graph traversal
- Shortest path
- Multi-hop exploration

---

## AI Historian

Ask natural language questions such as:

> Why did the Roman Empire collapse?

> Compare Augustus and Napoleon.

> Explain the causes of World War I.

The historian uses the structured historical database as grounding for AI responses.

---

## Scenario Engine

Historical datasets are packaged as scenarios.

Examples:

- Roman Empire
- Mongol Empire
- World War I
- Ancient Egypt
- Cold War
- Renaissance

Each scenario can populate the historical database independently.

---

# Current Dataset

Current Roman dataset contains approximately:

- 146 entities
- 24 historical events
- Wikipedia-enriched content
- Relationship graph
- Geographic coordinates

---

# Architecture

```
Browser
        │
        ▼
Vercel Frontend
        │
        ▼
API Gateway
        │
        ▼
AWS Lambda
        │
        ▼
Aurora PostgreSQL
        │
        ▼
Historical Knowledge Graph
```

---

# Technology Stack

## Frontend

- Next.js 15
- React
- TypeScript
- Tailwind CSS

Hosted on:

- Vercel

---

## Backend

- AWS Lambda
- API Gateway
- Node.js
- TypeScript

---

## Database

Amazon Aurora PostgreSQL

Stores:

- entities
- events
- relationships
- scenarios
- event_entities

---

## Infrastructure

AWS CDK

Infrastructure as Code includes:

- API Gateway
- Lambda
- IAM
- Security Groups
- Aurora connectivity

---

## Data Sources

### Wikidata

Automatically imports:

- Historical figures
- Empires
- Battles
- Cities
- Provinces
- Dynasties

---

### Wikipedia

Enriches imported entities with:

- Summary
- URL
- Thumbnail
- Description

---

# Repository Structure

```
.
├── app/                    # Next.js frontend
│
├── services/
│   └── api/                # Lambda handlers
│
├── infra/
│   └── cdk/                # AWS Infrastructure
│
├── db/
│   └── migrations/
│
├── scripts/
│
├── src/
│   ├── services/
│   ├── historian/
│   ├── wikipedia/
│   ├── wikidata/
│   └── scenarios/
│
└── public/
```

---

# Local Development

## Clone

```bash
git clone https://github.com/SuyashSalvi/Chronos-AI.git

cd Chronos-AI
```

---

## Install

```bash
npm install
```

---

## Environment Variables

Create:

```
.env.local
```

Example:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/postgres
NEXT_PUBLIC_API_BASE_URL=
```

---

## Start

```bash
npm run dev
```

---

# Database

Run migrations:

```bash
psql "$DATABASE_URL" \
-f db/migrations/001_initial_schema.sql

psql "$DATABASE_URL" \
-f db/migrations/002_wikipedia_enrichment.sql
```

---

# Import Historical Data

Roman Empire

```bash
npm run ingest:wikidata:rome
```

---

Wikipedia enrichment

```bash
npm run enrich:wikipedia
```

---

# API

## Entities

```
GET /entities
GET /entities/:id
GET /entities/:id/graph
GET /entities/:id/neighbors
GET /entities/:id/path
```

---

## Events

```
GET /events
GET /events/:id
GET /events/:id/entities
```

---

## Relationships

```
GET /relationships
```

---

## Search

```
GET /search?q=rome
```

---

## Timeline

```
GET /timeline
```

---

## Map

```
GET /map/markers
```

---

## Historian

```
POST /historian/ask
```

---

# Deployment

## Frontend

Hosted on:

Vercel

Deployment is automatic on pushes to `main`.

---

## Backend

Infrastructure managed through AWS CDK.

Deploy:

```bash
cd infra/cdk

npx cdk deploy
```

---

# Roadmap

## Phase 1

- Roman Empire
- Wikipedia enrichment
- Timeline
- Map
- Relationship graph

---

## Phase 2

- Additional civilizations
- Better search
- Interactive graph UI
- AI Historian

---

## Phase 3

- Semantic retrieval
- LLM reasoning
- Historical citations
- Alternate history engine

---

## Phase 4

- User accounts
- Saved timelines
- Collaborative exploration
- Learning mode

---

## Phase 5

- Historical simulation
- Civilization evolution
- AI-generated scenarios
- Interactive documentaries

---

# Contributing

Contributions are welcome.

Examples:

- New historical datasets
- Better relationship extraction
- UI improvements
- Infrastructure improvements
- Historical validation
- AI prompt improvements

---

# Future Work

- Redis caching
- OpenSearch
- Graph database integration
- Secrets Manager
- Private VPC
- Observability
- CI/CD for Lambda
- Multi-region deployment
- Event sourcing
- Temporal graph analytics

---

# License

MIT

---

# Author

Suyash Salvi

GitHub:

https://github.com/SuyashSalvi

---

> "History is not a list of dates. It is a graph of cause and effect."