// ═══════════════════════════════════════════════
// UNIROUTE — static.js
// 404, Contact and Privacy pages.
// ═══════════════════════════════════════════════

// Set this to the address you actually want to publish. It is shown on the
// Contact page and used for the mailto links, so it is the one thing to
// change before going live.
const CONTACT_EMAIL = 'hello@uniroute.example';

// Views that exist in the sidebar but are not built yet. Anything NOT in this
// list and not a real route is a genuine 404 rather than "coming soon".
const PLANNED_VIEWS = ['scholarships', 'visa', 'deadlines', 'reviews', 'compare', 'settings'];

// ── 404 ────────────────────────────────────────
function render404(attempted) {
  const dv = document.getElementById('dynamicView');
  if (!dv) return;
  dv.innerHTML = `
    <div class="page-wrap">
      <div class="static-page error-page">
        <p class="err-code">404</p>
        <h2 class="static-title">This page doesn't exist</h2>
        <p class="static-lead">
          ${attempted
            ? `There's nothing at <code class="err-path">${escHtml(String(attempted))}</code>.`
            : `The page you're looking for isn't here.`}
          It may have been moved, or the link may be wrong.
        </p>
        <div class="es-actions" style="justify-content:center">
          <button class="card-cta" onclick="navigateTo('home')">Go to Home</button>
          <button class="ghost-btn" onclick="navigateTo('search')">Search universities</button>
        </div>
        <div class="err-links">
          <span>Or try:</span>
          <button class="link-btn" onclick="navigateTo('countries')">Countries</button>
          <button class="link-btn" onclick="navigateTo('rank')">Rankings</button>
          <button class="link-btn" onclick="navigateTo('programs')">Programs</button>
        </div>
      </div>
    </div>`;
}

// ── Contact ────────────────────────────────────
function renderContact() {
  const dv = document.getElementById('dynamicView');
  if (!dv) return;
  dv.innerHTML = `
    <div class="page-wrap">
      <div class="static-page">
        <h2 class="static-title">Contact us</h2>
        <p class="static-lead">
          UNIROUTE is a university discovery directory. Whether you've spotted
          something wrong in our data or want to get in touch, email is the
          fastest way to reach us.
        </p>

        <div class="contact-grid">
          <div class="contact-card">
            <h3 class="contact-h">General enquiries</h3>
            <p>Questions about the site or how to use it.</p>
            <a class="contact-mail" href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>
          </div>
          <div class="contact-card">
            <h3 class="contact-h">Report incorrect data</h3>
            <p>
              Wrong ranking, outdated website, or a missing or inaccurate program
              listing. Please include the university name and what's wrong.
            </p>
            <a class="contact-mail"
               href="mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('UNIROUTE data correction')}"
            >Report a correction</a>
          </div>
          <div class="contact-card">
            <h3 class="contact-h">Universities</h3>
            <p>
              If you represent an institution and want your entry corrected or
              your program list updated, get in touch and tell us which pages
              to use as the source.
            </p>
            <a class="contact-mail"
               href="mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('UNIROUTE institution update')}"
            >Institutional enquiries</a>
          </div>
        </div>

        <h3 class="static-h">Before you write in</h3>
        <ul class="static-list">
          <li>
            <strong>Rankings</strong> come from the QS World University Rankings 2026.
            We publish them as given and can't change a university's position — those
            queries belong with QS.
          </li>
          <li>
            <strong>Program listings</strong> are taken from each university's own
            published catalogue, with the source recorded. Where we don't yet hold
            them, the page says so rather than guessing.
          </li>
          <li>
            <strong>We're not an admissions service.</strong> We can't process
            applications, forward them, or advise on your chances. Apply through the
            university's own website.
          </li>
        </ul>
      </div>
    </div>`;
}

// ── Privacy ────────────────────────────────────
// Describes what this site actually does. Keep it in step with the code:
// if analytics, accounts, cookies or a contact form are ever added, this page
// has to change with them.
function renderPrivacy() {
  const dv = document.getElementById('dynamicView');
  if (!dv) return;
  dv.innerHTML = `
    <div class="page-wrap">
      <div class="static-page">
        <h2 class="static-title">Privacy Policy</h2>
        <p class="static-updated">Last updated: September 2026</p>

        <p class="static-lead">
          UNIROUTE is a public directory of universities. You don't need an account
          to use it, and we don't ask you for personal information.
        </p>

        <h3 class="static-h">What we store on your device</h3>
        <p class="static-p">
          One item, in your browser's local storage:
        </p>
        <ul class="static-list">
          <li>
            <code>uniroute-theme</code> — whether you chose light or dark mode, so the
            site remembers next time.
          </li>
        </ul>
        <p class="static-p">
          That's it. <strong>We set no cookies</strong>, and this value never leaves your
          browser. Clearing your browser data removes it.
        </p>

        <h3 class="static-h">What we don't do</h3>
        <ul class="static-list">
          <li>No user accounts, sign-ups or logins.</li>
          <li>No analytics, tracking pixels or advertising networks.</li>
          <li>No selling or sharing of data, because we don't collect any.</li>
          <li>No profiling and no behavioural tracking across sites.</li>
        </ul>

        <h3 class="static-h">Third parties</h3>
        <p class="static-p">
          The site loads its typeface from <strong>Google Fonts</strong>. That request
          goes to Google's servers, which means Google receives your IP address and
          basic browser information. This is handled under
          <a href="https://policies.google.com/privacy" target="_blank" rel="noopener">Google's privacy policy</a>.
          It is the only third-party request the site makes.
        </p>

        <h3 class="static-h">Server logs</h3>
        <p class="static-p">
          Our API is queried for university and program data. As with any web server,
          the hosting provider may record standard request information such as IP
          address, timestamp and the URL requested, for reliability and abuse
          prevention. These requests are for public directory data and are not tied to
          any identity, because there is none to tie them to.
        </p>

        <h3 class="static-h">Where our data comes from</h3>
        <ul class="static-list">
          <li>Rankings: QS World University Rankings 2026.</li>
          <li>Institution names and websites: public higher-education datasets.</li>
          <li>Program listings: each university's own published catalogue, with the source recorded.</li>
        </ul>
        <p class="static-p">
          This is information about institutions, not about people.
        </p>

        <h3 class="static-h">External links</h3>
        <p class="static-p">
          We link out to university websites. Once you follow one, you're on their site
          and their privacy policy applies, not ours.
        </p>

        <h3 class="static-h">Children</h3>
        <p class="static-p">
          The site is aimed at prospective university students. Since we collect no
          personal information from anyone, we hold none about children either.
        </p>

        <h3 class="static-h">Changes</h3>
        <p class="static-p">
          If we add anything that changes how data is handled — analytics, accounts or
          a contact form — this page will be updated and the date above changed.
        </p>

        <h3 class="static-h">Contact</h3>
        <p class="static-p">
          Questions about this policy:
          <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>
        </p>

        <div class="static-note">
          This policy describes how the site currently behaves. It is not legal advice —
          if you operate UNIROUTE commercially or serve users in a jurisdiction with
          specific requirements such as the GDPR or CCPA, have it reviewed by someone
          qualified.
        </div>
      </div>
    </div>`;
}
