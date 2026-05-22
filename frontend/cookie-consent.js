(function () {
    const COOKIE_NAME = 'tensee_cookie_consent';
    const MAX_AGE = 60 * 60 * 24 * 180;

    function getCookie(name) {
        return document.cookie
            .split('; ')
            .find((row) => row.startsWith(`${name}=`))
            ?.split('=')[1];
    }

    function setCookie(name, value) {
        const secure = window.location.protocol === 'https:' ? '; Secure' : '';
        document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${MAX_AGE}; Path=/; SameSite=Lax${secure}`;
    }

    function saveConsent(preferences) {
        const consent = {
            necessary: true,
            analytics: Boolean(preferences.analytics),
            marketing: Boolean(preferences.marketing),
            savedAt: new Date().toISOString()
        };

        setCookie(COOKIE_NAME, JSON.stringify(consent));
        window.TenSeeCookieConsent = consent;
        document.dispatchEvent(new CustomEvent('tensee:cookies-updated', { detail: consent }));
        document.getElementById('cookieConsent')?.classList.remove('is-visible');
    }

    function renderBanner() {
        if (getCookie(COOKIE_NAME)) return;

        const banner = document.createElement('section');
        banner.className = 'cookie-consent is-visible';
        banner.id = 'cookieConsent';
        banner.setAttribute('aria-label', 'Cookie consent');
        banner.innerHTML = `
            <div class="cookie-panel">
                <div class="cookie-copy">
                    <h2>Cookie preferences</h2>
                    <p>We use necessary cookies to keep the site working, plus optional cookies to understand visits and improve Ten&See.</p>
                </div>
                <div class="cookie-actions">
                    <button class="cookie-btn" type="button" data-cookie-action="reject">Reject optional</button>
                    <button class="cookie-btn" type="button" data-cookie-action="manage">Manage</button>
                    <button class="cookie-btn primary" type="button" data-cookie-action="accept">Accept all</button>
                </div>
                <div class="cookie-preferences" id="cookiePreferences">
                    <div class="cookie-option">
                        <div>
                            <strong>Necessary cookies</strong>
                            <span>Required for security, forms, and saved consent.</span>
                        </div>
                        <label class="cookie-switch" aria-label="Necessary cookies always on">
                            <input type="checkbox" checked disabled>
                            <span class="cookie-slider"></span>
                        </label>
                    </div>
                    <div class="cookie-option">
                        <div>
                            <strong>Analytics cookies</strong>
                            <span>Help us understand which pages are useful.</span>
                        </div>
                        <label class="cookie-switch" aria-label="Allow analytics cookies">
                            <input type="checkbox" id="cookieAnalytics">
                            <span class="cookie-slider"></span>
                        </label>
                    </div>
                    <div class="cookie-option">
                        <div>
                            <strong>Marketing cookies</strong>
                            <span>Support more relevant updates and campaigns.</span>
                        </div>
                        <label class="cookie-switch" aria-label="Allow marketing cookies">
                            <input type="checkbox" id="cookieMarketing">
                            <span class="cookie-slider"></span>
                        </label>
                    </div>
                    <div class="cookie-actions">
                        <button class="cookie-btn primary" type="button" data-cookie-action="save">Save choices</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(banner);
        banner.addEventListener('click', (event) => {
            const button = event.target.closest('[data-cookie-action]');
            if (!button) return;

            const action = button.dataset.cookieAction;
            if (action === 'accept') saveConsent({ analytics: true, marketing: true });
            if (action === 'reject') saveConsent({ analytics: false, marketing: false });
            if (action === 'manage') document.getElementById('cookiePreferences')?.classList.toggle('is-open');
            if (action === 'save') {
                saveConsent({
                    analytics: document.getElementById('cookieAnalytics')?.checked,
                    marketing: document.getElementById('cookieMarketing')?.checked
                });
            }
        });
    }

    document.addEventListener('DOMContentLoaded', renderBanner);
})();
