# Property Compliance Review

Build a clean, modern internal tool for a real estate brokerage and legal team to review property documents for compliance. Professional, minimal layout, neutral colors. Top nav titled "Document Compliance Checker". The main page has: a large text area labeled "Paste the agreement text here" with helpful placeholder text; a document-type dropdown with options "Rental Agreement" and "Sale Agreement", defaulting to "Rental Agreement"; and an "Analyze Document" button below them. Beneath that, leave an empty results area (we'll fill it in a later step). At the bottom, a section titled "Past Analyses" that lists saved rows from the Supabase analyses table (showing title, doc_type, verdict, and created date), with a friendly empty-state message when there are none. No authentication or login.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://property-doc-check.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/3ddf7f9a-960e-4548-895a-dd202657668c).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
