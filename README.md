# InfoSauce

### Your Personal AI Information Radar

🔗 **Live Demo:** https://youtu.be/SGyzc1XOn4s?si=ncNgLn3tRdFQKzae

## 🎯 Problem

Information is fragmented across news websites, social media platforms and other online sources. Users need to switch between platforms, repeat searches, and compare conflicting claims to understand what is happening.
This fragmentation creates several challenges:
1. Information overload: Too much content competes for attention.
2. Information gaps: Important developments may reach some people earlier than others.
3. Missed updates: Relevant information can disappear inside fast-moving feeds.
4. Misinformation: It is difficult to distinguish verified facts from rumors, opinions, or manipulated content.
5. Fear of missing out (FOMO): Users feel pressure to monitor multiple platforms continuously.
6. Time-consuming verification: Checking sources, dates, context, and competing claims requires significant effort.
7. Algorithmic filter bubbles: Platform feeds may prioritize engagement rather than relevance, accuracy, or completeness.

## 💡 Solution

InfoSauce is an AI-powered personal information radar that brings discovery, monitoring, summarization, analysis, and verification into one intelligent hub. It can gather relevant information from multiple sources, remove duplicates, highlight meaningful updates, and present the results in a clear and organized format.
Instead of searching across numerous platforms, users can use InfoSauce to:
1. Discover the latest information in one place.
2. Track topics continuously and receive relevant updates.
3. Generate concise summaries of lengthy content.
4. Compare how different sources report the same event.
5. Trace important claims back to their original sources.
6. Identify conflicting information and missing context.
7. Reduce noise while avoiding important missed updates.

## ✨ Main Features

### 📰 Daily Sauce (Digital News Generator)

Users select topics they are interested in, such as:

- AI & Technology
- K-pop & Entertainment
- World & Local
- Business & Lifestyle
- Sports & Gaming

InfoSauce generates a personalized daily information briefing with:

- Daily Information 
- Trending Topics
- AI-generated summaries
- Supporting sources and evidence

### 📸 Fact Check

Users can upload a screenshot, file or a URL for information they are unsure about. 
InfoSauce:
1. Analyzes the information
2. Extracts the main claim
3. Checks available evidence
4. Uses AI to analyze the claim
5. Provides a fact-check result
6. Provides a confidence percentage
7. Shows supporting sources and related information


## 🏗️ How It Works 
# InfoSauce — Gonka Router Integration
InfoSauce uses **Gonka Router as its AI-powered verification layer** to help users evaluate the trustworthiness of information found across social media and other research sources.
The system combines multiple AI models, evidence retrieval, model consensus, and a custom Truth Score algorithm to produce a more robust fact-checking result.

---

## How Gonka Router Is Used

Gonka Router sits inside the verification pipeline of InfoSauce.

```text
User / Social Media Information
            │
            ▼
      Extract the Claim
            │
            ▼
      Retrieve Evidence
            │
            ▼
       Rank Evidence
            │
            ▼
      ┌───────────────┐
      │ Gonka Router  │
      └───────┬───────┘
              │
       ┌──────┴──────┐
       ▼             ▼
   DeepSeek        MiniMax
       │             │
       └──────┬──────┘
              ▼
        Model Verdicts
              │
              ▼
          Consensus
              │
              ▼
         Truth Score
              │
              ▼
      Result + Evidence
              │
              ▼
           Frontend
```

Gonka Router allows InfoSauce to send the same claim and supporting evidence to multiple AI models through a unified API interface.

---

## Verification Pipeline

### 1. Claim Extraction

InfoSauce first identifies the specific factual claim that needs to be verified.

For example:

> "Amazon stock dropped to $43 during the 2008 financial crisis."

Instead of asking the AI to evaluate an entire social media post, InfoSauce extracts the specific claim and uses that as the basis for verification.

```text
Social Media Post
       │
       ▼
Claim Extraction
       │
       ▼
Specific Factual Claim
```
---
### 2. Evidence Retrieval

After extracting the claim, the backend searches available research sources for relevant information.

```text
Claim
 │
 ▼
Data Service
 │
 ├── Web / Exa
 ├── Social Media Sources
 └── Other Research Sources
 │
 ▼
Potential Evidence
```

The evidence is then cleaned and ranked so that the most relevant information can be provided to the AI models.

The submitted social media post itself is **not automatically treated as independent evidence**. This helps avoid circular verification.

---

### 3. Evidence Ranking

InfoSauce does not simply send every retrieved result to the AI.

Potential evidence is ranked based on factors such as:

* Relevance to the claim
* Similarity to important claim phrases
* Source information
* Recency
* Content quality

The highest-ranked evidence is selected and sent to the verification models.

This reduces unnecessary information and allows the models to focus on the strongest available evidence.

---

## 4. Verification Through Gonka Router

The selected claim and evidence are sent to Gonka Router.

InfoSauce currently uses multiple models:

```text
DeepSeek
deepseek-ai/DeepSeek-V4-Flash-0731

MiniMax
MiniMaxAI/MiniMax-M2.7
```

Each model independently evaluates the claim and returns a structured verification result.

A typical model response contains:

```json
{
  "verdict": "TRUE",
  "confidence": 0.95,
  "reasoning": "The available evidence supports the claim.",
  "evidence": [
    {
      "evidenceIndex": 0,
      "support": "This source directly supports the claim."
    }
  ]
}
```

The structured response gives InfoSauce the information required for the next stages of the verification pipeline.

---

## 5. Model Consensus

InfoSauce does not rely on a single AI model's answer.

The individual model verdicts are compared by the backend.

For example:

```text
DeepSeek → TRUE
MiniMax  → TRUE

        ↓

Consensus → TRUE
```

If the models disagree:

```text
DeepSeek → TRUE
MiniMax  → FALSE

        ↓

Consensus → UNCERTAIN
```

This approach reduces the impact of a single model making an incorrect judgment.

The consensus system records:

* Final consensus verdict
* Number of TRUE votes
* Number of FALSE votes
* Total models
* Failed models
* Whether consensus was reached
* Whether the models disagreed

---

## 6. Truth Score

The final **Truth Score is calculated by InfoSauce**, not directly provided by Gonka Router.

Gonka provides the AI model judgments and confidence values. InfoSauce then combines this information with its own verification logic.

The Truth Score considers:

```text
Model Confidence
       +
Evidence Coverage / Reliability
       +
Model Consensus
       ↓
   Truth Score
```

The score ranges from **0 to 100**:

|  Score | Interpretation |
| -----: | -------------- |
|   0–49 | False          |
|     50 | Uncertain      |
| 51–100 | True           |

A score of 50 is reserved for cases where the available information does not provide sufficient confidence for a True or False classification.

---

## 7. Result Returned to the Frontend

After verification is complete, the backend returns the verification result to the frontend.

A result can contain:

```json
{
  "claim": "Example claim",
  "verdict": "TRUE",
  "truthScore": 93.75,
  "reasoning": "The available evidence strongly supports the claim.",
  "consensus": {
    "verdict": "TRUE",
    "voteCounts": {
      "TRUE": 2,
      "FALSE": 0
    }
  },
  "evidence": [
    {
      "title": "Example source",
      "source": "Example publication",
      "url": "https://example.com"
    }
  ]
}
```

The frontend can then display:

* Truth Score
* Verdict
* AI reasoning
* Model consensus
* Supporting evidence
* Source links

---

# Gonka's Role in the Overall Architecture

Gonka Router is one component of a larger InfoSauce pipeline.

```text
┌──────────────────────────────────────────┐
│                 InfoSauce                │
│                                          │
│  Trending    Daily Sauce    Sauce Verify│
└───────────────────┬──────────────────────┘
                    │
                    ▼
             ┌──────────────┐
             │   Backend    │
             │              │
             │ Claim        │
             │ Extraction   │
             │ Evidence     │
             │ Ranking      │
             └──────┬───────┘
                    │
                    ▼
             ┌──────────────┐
             │     Data     │
             │    Service   │
             │              │
             │ Research     │
             │ Sources      │
             └──────┬───────┘
                    │
                    ▼
             Evidence Results
                    │
                    ▼
             ┌──────────────┐
             │    Gonka     │
             │    Router    │
             └──────┬───────┘
                    │
              ┌─────┴─────┐
              ▼           ▼
          DeepSeek      MiniMax
              │           │
              └─────┬─────┘
                    ▼
              AI Verdicts
                    │
                    ▼
               Consensus
                    │
                    ▼
              Truth Score
                    │
                    ▼
               Frontend
```

This separation gives each component a clear responsibility:

| Component              | Responsibility                                |
| ---------------------- | --------------------------------------------- |
| **Frontend**           | User interface and result presentation        |
| **Backend**            | Verification orchestration and business logic |
| **Data Service**       | Research and evidence collection              |
| **Gonka Router**       | AI model routing and inference                |
| **DeepSeek / MiniMax** | Independent claim evaluation                  |
| **Consensus System**   | Combines model verdicts                       |
| **Truth Score System** | Produces the final 0–100 score                |

---

# Why Use Multiple Models?

A key design decision in InfoSauce is to use **model consensus rather than relying on one AI model**.

Different AI models can interpret evidence differently or occasionally produce incorrect conclusions.

By asking multiple models to independently evaluate the same claim:

```text
                Claim + Evidence
                       │
             ┌─────────┴─────────┐
             ▼                   ▼
          DeepSeek             MiniMax
             │                   │
             ▼                   ▼
          Verdict A            Verdict B
             │                   │
             └─────────┬─────────┘
                       ▼
                   Consensus
                       │
                       ▼
                  Truth Score
```

InfoSauce can identify agreement and disagreement between the models instead of treating a single model's response as absolute truth.

---

# The Three InfoSauce Features

The same Gonka-powered verification pipeline is shared across all three major features.

### Trending

Identifies information gaining attention and verifies the claims behind the content.

```text
Trending Content
      ↓
Claim Extraction
      ↓
Evidence
      ↓
Gonka
      ↓
Consensus
      ↓
Truth Score
```

### Daily Sauce

Allows users to search for a topic and receive relevant information together with verification results.

```text
User Topic
    ↓
Research
    ↓
Relevant Stories
    ↓
Claim Extraction
    ↓
Evidence
    ↓
Gonka
    ↓
Truth Score
```

### Sauce Verify

Allows users to submit information or a URL they want to verify.

```text
User Submission
      ↓
Content Extraction
      ↓
Claim Extraction
      ↓
Evidence
      ↓
Gonka
      ↓
Consensus
      ↓
Truth Score
```

---

# Key Design Principle

The core principle behind the InfoSauce verification system is:

> **Gonka Router provides the AI reasoning layer, while InfoSauce builds the verification system around it.**

Gonka Router is responsible for routing verification requests to AI models.

InfoSauce is responsible for:

1. Extracting the claim
2. Finding relevant evidence
3. Ranking evidence
4. Preparing the AI input
5. Comparing model verdicts
6. Calculating consensus
7. Calculating the Truth Score
8. Presenting the reasoning and evidence to the user

This allows Gonka Router to function as the AI inference layer while InfoSauce provides the application-specific fact-checking logic.


## 🛠️ Tech Stack 

| Layer | Technologies |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| Backend | Node.js, Express.js |
| AI Verification | Gonka AI Router, DeepSeek, MiniMax |
| Research & Evidence | OpenCLI, Exa, Mozilla Readability, JSDOM |
| Platforms | X, Reddit, YouTube, Bilibili, Web |
| Testing | Vitest, ESLint, TypeScript |
| Deployment | Vercel |
| Version Control | Git, GitHub |


## 🚀 Getting Started

Follow the steps below to run **InfoSauce** locally.

### 1. Prerequisites

Make sure you have the following installed:

- **Node.js** (Node.js 20 or later recommended)
- **npm**
- **Git**

### 2. Clone the Repository

```bash
git clone https://github.com/new0801/InfoSauce.git
```

Navigate into the project directory:

```bash
cd InfoSauce
```

### 3. Install Dependencies

Install all required project dependencies:

```bash
npm install
```

### 4. Environment Variables

If you are working with features that require external APIs or AI services, create a `.env.local` file in the root directory:

```bash
touch .env.local
```

Add the required API keys and environment variables provided by the team.

> ⚠️ Do not commit `.env.local` or expose API keys publicly.

### 5. Start the Development Server

Run:

```bash
npm run dev
```

The application will start locally at:

```text
http://localhost:3000
```

Open it in your browser to access InfoSauce.

### 6. Development

The application automatically reloads when changes are made to the source code.

Main application files can be found inside:

```text
src/
```

After making changes, save the file and check the browser to see the updated application.

### 7. Build for Production

To verify that the project can successfully build for production:

```bash
npm run build
```

Then run the production build with:

```bash
npm start
```

### 8. Lint the Project

Before committing your changes, check the project for linting issues:

```bash
npm run lint
```

### Quick Setup

For developers who already have Node.js and Git installed:

```bash
git clone https://github.com/new0801/InfoSauce.git
cd InfoSauce
npm install
npm run dev
```

Then open `http://localhost:3000` in your browser.

## 📂 Project Structure 

## 📁 Project Structure

InfoSauce is organized into separate frontend, backend, and data/research layers. This separation allows each part of the system to focus on a specific responsibility while remaining easy to develop and integrate.

```text
InfoSauce/
│
├── src/
│   ├── app/
│   │   ├── pages and UI
│   │   ├── application routes
│   │   └── frontend API integration
│   │
│   └── data/
│       ├── news and category data
│       ├── research functions
│       ├── evidence processing
│       ├── source information
│       └── shared data types
│
├── backend/
│   └── src/
│       ├── routes/
│       │   └── API endpoints
│       │
│       ├── services/
│       │   ├── claim processing
│       │   ├── evidence processing
│       │   ├── Gonka AI verification
│       │   ├── model consensus
│       │   └── Truth Score calculation
│       │
│       ├── testing/
│       │   └── backend testing utilities
│       │
│       └── server.js
│           └── Express backend entry point
│
├── public/
│   └── static assets
│
├── InfoSauce-dev-frontend/
│   └── frontend development workspace
│
├── InfoSauce-dev-backend/
│   └── backend development workspace
│
├── InfoSauce-dev-data/
│   └── data and research development workspace
│
├── package.json
├── next.config.ts
├── tsconfig.json
├── README.md
└── .gitignore
```

### Frontend

The frontend is built with **Next.js and TypeScript**. It provides the user interface for the three main InfoSauce features:

* **Trending** — displays information currently gaining attention.
* **Daily Sauce** — generates personalized topic-based information briefings.
* **Sauce Verify** — allows users to verify submitted information or URLs.

The frontend communicates with the backend through API endpoints and presents research results, evidence, AI verdicts, consensus results, and Truth Scores to users.

### Backend

The backend handles the main application logic and coordinates the verification pipeline.

Its responsibilities include:

* Receiving frontend requests
* Extracting factual claims
* Requesting and processing evidence
* Preparing evidence for AI verification
* Sending claims and evidence to Gonka Router
* Combining multiple AI model verdicts
* Calculating the final Truth Score
* Returning structured verification results to the frontend

### Data & Research Layer

The data layer is responsible for retrieving and organizing information from different sources.

It handles:

* Topic and news data
* Multi-platform research
* Source metadata
* Evidence collection
* Evidence filtering and ranking
* Data transformation
* Shared types and structures used by the application

Research results are passed to the backend verification pipeline before being displayed to users.

### Gonka Verification Layer

Gonka Router acts as the AI verification layer of InfoSauce.

```text
User Request
     │
     ▼
Frontend
     │
     ▼
Backend
     │
     ▼
Data / Research
     │
     ▼
Evidence Selection
     │
     ▼
Gonka Router
     │
     ├──────────────┐
     ▼              ▼
 DeepSeek        MiniMax
     │              │
     └──────┬───────┘
            ▼
       Consensus
            │
            ▼
       Truth Score
            │
            ▼
         Result
            │
            ▼
        Frontend
```

This architecture keeps **information retrieval**, **AI verification**, **business logic**, and **user interface** separated, making InfoSauce easier to maintain, test, and extend.

## 👥 Team

- Frontend — UI/UX and user interaction
- Backend — API and Gonka integration
- Data — Information sources, evidence and data processing

## 🔮 Future Improvements

- More social media integrations
- More advanced misinformation detection
- Personalized notifications
- Multilingual analysis
- More comprehensive source verification

## 📌 Project Vision

InfoSauce aims to reduce information overload and information gaps by helping people discover what matters, understand what happened, and verify what they see.

> **InfoSauce — Know what you shouldn't miss.**

