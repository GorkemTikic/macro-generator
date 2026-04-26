# GitHub Deployment & Sync Guide

Follow these steps to publish your app to GitHub and keep it updated.

## 1. Initial Publish to GitHub

1.  **Create Repository**: Go to [GitHub](https://github.com/GorkemTikic/macro-generator) (already created).
2.  **Enable GitHub Pages from Actions**:
    - Go to your repository **Settings** -> **Pages**.
    - For **Build and deployment** > **Source**, change from "Deploy from a branch" to **"GitHub Actions"**.
    - *(This is required for the automated workflow to work!)*
3.  **Link Local to GitHub**: Run the following commands in your terminal:
    ```bash
    git remote add origin https://github.com/GorkemTikic/macro-generator.git
    git branch -M main
    git push -u origin main
    ```
    *(Replace `YOUR_GITHUB_USERNAME` with your actual username.)*

## 2. Automatic Deployment (GitHub Pages)

Once you push to the `main` branch, a **GitHub Action** will automatically build and deploy your app.
- **To see progress**: Go to the **Actions** tab in your GitHub repository.
- **To see your site**: Once the action finishes, your site will be live at:
  `https://YOUR_GITHUB_USERNAME.github.io/macro-generator/`

## 3. How to Update GitHub from Here (Local -> GitHub)

Whenever you make changes locally and want to push them to GitHub:
1.  **Stage and Commit**:
    ```bash
    git add .
    git commit -m "Describe your changes here"
    ```
2.  **Push**:
    ```bash
    git push origin main
    ```
    The GitHub Page will update automatically after a few minutes.

## 4. How to Update Here from GitHub (GitHub -> Local)

If you (or another agent/user) make changes directly on GitHub:
1.  **Pull**:
    ```bash
    git pull origin main
    ```
    This will bring all changes from GitHub to your local folder.

## 5. Summary of Built-in Scripts
In your `package.json`, you also have these tools:
- `npm run dev`: Starts the local development server (currently running).
- `npm run build`: Manually builds the project for production.
- `npm run deploy`: Manually deploys to GitHub Pages using the `gh-pages` library (as a backup to the automatic GitHub Action).
