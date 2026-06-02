# OMDb Movie Finder

A responsive single page application that searches the OMDb API and displays movie details without reloading the page.

## Live Demo

After enabling GitHub Pages, the project will be available at:

```text
https://your-username.github.io/omdb-project/
```

## Features

- Search OMDb by movie, series, or episode title
- Optional filters for type and release year
- Responsive layout for desktop, tablet, and mobile screens
- Movie detail view with title, year, genre, director, poster, plot, actors, awards, and ratings
- Clear error handling for missing API keys, failed API requests, and empty results
- Multiple searches without page refresh
- Last search and selected movie are restored with `localStorage` and URL parameters
- Lightweight HTML, CSS, and JavaScript implementation

## Technologies

- HTML5
- CSS3
- JavaScript
- OMDb API
- GitHub Pages

## Getting an OMDb API Key

1. Go to [omdbapi.com/apikey.aspx](https://www.omdbapi.com/apikey.aspx).
2. Request a free API key.
3. Open the app and expand **API key settings**.
4. Paste the key and click **Save key**.

The API key is stored only in the browser's `localStorage`. It is not committed to this repository.

## Running Locally

Because this is a static project, you can open `index.html` directly in a browser.

For a local server, run:

```bash
python -m http.server 5500
```

Then open:

```text
http://localhost:5500
```

## Deployment with GitHub Pages

1. Create a public repository from the assignment template and name it `omdb-project`.
2. Upload `index.html`, `styles.css`, `app.js`, and `README.md` to the repository.
3. Go to **Settings** > **Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select the `main` branch and `/root` folder.
6. Save the settings and wait for GitHub Pages to publish the site.

## Project Structure

```text
omdb-project/
├── index.html
├── styles.css
├── app.js
└── README.md
```

## Notes

The app uses the official OMDb API endpoint:

```text
https://www.omdbapi.com/
```

Search requests use the `s`, `type`, and `y` parameters. Movie detail requests use the `i` parameter with the IMDb ID returned by search results.
