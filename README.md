# Various Facets of Life

A React + Phaser game application exploring different aspects of life.

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   ```bash
   npm install
   ```
2. Set the `GEMINI_API_KEY` in `.env.local` to your Gemini API key (if needed)
3. Run the app:
   ```bash
   npm run dev
   ```

## Deploy to GitHub Pages

This project is set up for automatic deployment to GitHub Pages. Follow these steps:

### 1. Create a GitHub Repository

1. Go to [GitHub](https://github.com) and sign in
2. Click the "+" icon in the top right → "New repository"
3. Name your repository (e.g., `various-facets-of-life`)
4. **Don't** initialize with README, .gitignore, or license (we already have these)
5. Click "Create repository"

### 2. Push Your Code to GitHub

Run these commands in your terminal (replace `YOUR_USERNAME` with your GitHub username):

```bash
# Add all files
git add .

# Create initial commit
git commit -m "Initial commit"

# Add your GitHub repository as remote (replace YOUR_USERNAME and REPO_NAME)
git remote add origin https://github.com/YOUR_USERNAME/various-facets-of-life.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### 3. Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** → **Pages** (in the left sidebar)
3. Under "Source", select **GitHub Actions**
4. The deployment will start automatically!

### 4. Access Your Live Site

After the first deployment completes (usually takes 1-2 minutes):
- Your site will be available at: `https://YOUR_USERNAME.github.io/various-facets-of-life/`
- You can find the exact URL in: **Settings** → **Pages**

### Automatic Updates

Every time you push code to the `main` branch, GitHub Actions will automatically:
- Build your project
- Deploy it to GitHub Pages
- Your site will update within a few minutes

### Manual Deployment

If you want to deploy manually, you can also:
1. Go to **Actions** tab in your GitHub repository
2. Click **Deploy to GitHub Pages** workflow
3. Click **Run workflow** → **Run workflow**

---

**Note:** If your repository name is different, you may need to update the `base` path in `vite.config.ts` to match your repository name.
