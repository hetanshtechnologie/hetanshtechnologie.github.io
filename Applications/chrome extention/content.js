(function () {
  'use strict';

  const FIELD_MAP = {
    firstName: ['first.?name', 'fname', 'given.?name', 'prenom'],
    lastName: ['last.?name', 'lname', 'surname', 'family.?name', 'nom'],
    fullName: ['full.?name', 'your.?name', 'applicant.?name', 'name', 'candidate.?name'],
    email: ['email', 'e-mail', 'mail'],
    phone: ['phone', 'mobile', 'telephone', 'tel', 'contact.?number', 'cell'],
    linkedIn: ['linkedin', 'linked.?in', 'profile.?url', 'social.?profile'],
    resumeUrl: ['resume', 'cv', 'portfolio.?url', 'resume.?url', 'cv.?url', 'cover.?letter'],
    coverLetter: ['cover.?letter', 'message', 'additional.?info', 'notes', 'description'],
    address: ['address', 'street', 'city', 'location'],
    website: ['website', 'personal.?url', 'portfolio', 'github']
  };

  const PERSONAL_FIELDS = {
    firstName: 'Hetansh',
    lastName: 'Technologie',
    fullName: 'Hetansh Technologie',
    email: 'hetanshtechnologie@gmail.com',
    phone: '',
    linkedIn: 'https://linkedin.com/in/Hetansh Technologie ',
    resumeUrl: '',
    coverLetter: '',
    website: 'https://HetanshTechnologie.github.io'
  };

  function matchField(input) {
    const label = (input.getAttribute('aria-label') || '').toLowerCase();
    const placeholder = (input.getAttribute('placeholder') || '').toLowerCase();
    const name = (input.getAttribute('name') || '').toLowerCase();
    const id = (input.getAttribute('id') || '').toLowerCase();
    const autocomplete = (input.getAttribute('autocomplete') || '').toLowerCase();

    const all = [label, placeholder, name, id, autocomplete].join(' ');

    if (autocomplete) {
      if (autocomplete === 'given-name' || autocomplete === 'first-name') return 'firstName';
      if (autocomplete === 'family-name' || autocomplete === 'last-name') return 'lastName';
      if (autocomplete === 'name') return 'fullName';
      if (autocomplete === 'email') return 'email';
      if (autocomplete === 'tel') return 'phone';
      if (autocomplete === 'url') return 'website';
    }

    for (const [key, patterns] of Object.entries(FIELD_MAP)) {
      for (const pat of patterns) {
        if (new RegExp(pat, 'i').test(all)) return key;
      }
    }

    const prevSibling = input.previousElementSibling;
    if (prevSibling) {
      const prevText = (prevSibling.textContent || '').toLowerCase();
      for (const [key, patterns] of Object.entries(FIELD_MAP)) {
        for (const pat of patterns) {
          if (new RegExp(pat, 'i').test(prevText)) return key;
        }
      }
    }

    const parent = input.closest('label');
    if (parent) {
      const labelText = (parent.textContent || '').toLowerCase();
      for (const [key, patterns] of Object.entries(FIELD_MAP)) {
        for (const pat of patterns) {
          if (new RegExp(pat, 'i').test(labelText)) return key;
        }
      }
    }

    return null;
  }

  function fillInput(input, value) {
    if (!value) return false;
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype, 'value'
    ).set;
    const nativeTextareaValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype, 'value'
    ).set;

    if (input.tagName === 'TEXTAREA') {
      nativeTextareaValueSetter.call(input, value);
    } else {
      nativeInputValueSetter.call(input, value);
    }

    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.dispatchEvent(new Event('blur', { bubbles: true }));
    return true;
  }

  function fillSelect(select, value) {
    if (!value) return false;
    const options = Array.from(select.options);
    const match = options.find(opt =>
      opt.value.toLowerCase() === value.toLowerCase() ||
      opt.textContent.toLowerCase() === value.toLowerCase()
    );
    if (match) {
      select.value = match.value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
    return false;
  }

  function autofillProfile(profile) {
    let filled = 0;
    const fields = document.querySelectorAll('input, textarea, select');

    fields.forEach(field => {
      const key = matchField(field);
      if (!key) return;

      const value = profile[key];
      if (!value) return;

      if (field.tagName === 'SELECT') {
        if (fillSelect(field, value)) filled++;
      } else if (field.type === 'file') {
        return;
      } else {
        if (fillInput(field, value)) filled++;
      }
    });

    return filled;
  }

  function highlightFillableFields() {
    const fields = document.querySelectorAll('input, textarea, select');
    let count = 0;

    fields.forEach(field => {
      const key = matchField(field);
      if (key && PERSONAL_FIELDS[key]) {
        field.style.outline = '2px solid #3b82f6';
        field.style.outlineOffset = '1px';
        field.setAttribute('data-jt-fillable', key);
        count++;
      }
    });

    return count;
  }

  function clearHighlights() {
    document.querySelectorAll('[data-jt-fillable]').forEach(el => {
      el.style.outline = '';
      el.style.outlineOffset = '';
      el.removeAttribute('data-jt-fillable');
    });
  }

  const JOB_SITES = new Set([
    'naukri', 'linkedin', 'indeed', 'glassdoor', 'wellfound', 'angellist',
    'dice', 'ziprecruiter', 'monster', 'careerbuilder', 'greenhouse',
    'lever', 'workday', 'icims', 'smartrecruiters', 'ashby', 'bamboohr',
    'jazzhr', 'successfactors'
  ]);

  function cleanText(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  }

  function findJobPostingJsonLd() {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of scripts) {
      let data;
      try {
        data = JSON.parse(script.textContent);
      } catch (e) {
        continue;
      }
      const items = Array.isArray(data) ? data : (data && data['@graph'] ? data['@graph'] : [data]);
      for (const item of items) {
        if (item && item['@type'] === 'JobPosting') return item;
      }
    }
    return null;
  }

  function firstTextIn(root, selectors, skipSites) {
    const base = root || document;
    for (const selector of selectors) {
      const el = base.querySelector(selector);
      if (!el) continue;
      const text = cleanText(el.textContent);
      if (!text) continue;
      if (skipSites && JOB_SITES.has(text.toLowerCase())) continue;
      return text;
    }
    return null;
  }

  function firstText(selectors, skipSites) {
    return firstTextIn(document, selectors, skipSites);
  }

  function isLinkedIn() {
    const h = window.location.hostname.toLowerCase();
    return h === 'linkedin.com' || h.endsWith('.linkedin.com');
  }

  function detectLinkedInCompany() {
    // 1) Right-rail details panel of the currently open job (most reliable).
    const detail = firstText([
      '[data-testid="job-details-company-name"]',
      '.job-details-jobs-unified-top-card__company-name',
      '.jobs-unified-top-card__company-name',
      'a[data-tracking-control-name*="org-name"]',
      '.topcard__org-name-link',
      '.job-details-jobs-unified-top-card__primary-description a[href*="/company/"]',
      '[class*="top-card"] a[href*="/company/"]'
    ], true);
    if (detail) return detail;

    // 2) If a specific job is selected, read company from exactly that card.
    const jobId = new URLSearchParams(window.location.search).get('currentJobId');
    if (jobId) {
      const card = document.querySelector(
        '[data-job-id="' + jobId + '"],' +
        '[data-id="' + jobId + '"],' +
        '[data-entity-urn$="jobPosting:' + jobId + '"],' +
        '[data-entity-urn*="' + jobId + '"]'
      );
      if (card) {
        const name = firstTextIn(card, [
          '.job-card-container__company-name',
          '.base-search-card__subtitle',
          'h4 a',
          'a[href*="/company/"]',
          '[class*="company-name"]'
        ], true);
        if (name) return name;
      }
    }

    // 3) Fallback: first company name in any result card.
    return firstText([
      '.job-card-container__company-name',
      '.base-search-card__subtitle',
      'h4 a',
      'a[href*="/company/"]'
    ], true);
  }

  function detectCompany() {
    const ld = findJobPostingJsonLd();
    if (ld && ld.hiringOrganization && ld.hiringOrganization.name) {
      return cleanText(ld.hiringOrganization.name);
    }

    if (isLinkedIn()) {
      const li = detectLinkedInCompany();
      if (li) return li;
    }

    const fromDom = firstText([
      'a[href*="-company-jobs"]',
      'a[href*="/companies/"]',
      'a[href*="/company/"]',
      'a[href*="/company-"]',
      '[class*="company-link"]',
      '[class*="company-name"]',
      '[class*="comp-name"]',
      '[class*="job-header-comp"]',
      '[class*="jd_company"]',
      '[data-qa*="company"]',
      '[class*="header-comp"]'
    ], true);
    if (fromDom) return fromDom;

    const meta = document.querySelector('meta[property="og:site_name"]');
    const siteName = meta ? cleanText(meta.getAttribute('content')) : '';
    if (siteName && !JOB_SITES.has(siteName.toLowerCase())) return siteName;
    return null;
  }

  function findLabelValue(label) {
    const nodes = [];
    document.querySelectorAll('span, div, p, li, dt, h2, h3').forEach(el => {
      const t = cleanText(el.textContent);
      if (t && t.toLowerCase() === label.toLowerCase() && el.children.length === 0) {
        nodes.push(el);
      }
    });
    for (const el of nodes) {
      const sibling = el.nextElementSibling;
      if (sibling) {
        const v = cleanText(sibling.textContent);
        if (v) return v;
      }
      const parent = el.parentElement;
      if (parent) {
        const parentText = cleanText(parent.textContent);
        const value = cleanText(parentText.slice(label.length));
        if (value && value !== label) return value;
      }
    }
    return null;
  }

  function cleanTitle(value) {
    let text = cleanText(value);
    text = text.split('|')[0].trim();
    text = text.replace(/\s*[-|\u2013]\s*$/, '').trim();
    if (/404|not found|could not be found/i.test(text) && text.length < 40) return '';
    return text;
  }

  function detectJobTitle() {
    const ld = findJobPostingJsonLd();
    if (ld && ld.title) return cleanText(ld.title);

    const h1 = document.querySelector('h1');
    if (h1) {
      const text = cleanText(h1.textContent);
      if (text && !/404|not found/i.test(text)) return text;
    }

    const og = document.querySelector('meta[property="og:title"]');
    if (og) {
      const title = cleanTitle(og.getAttribute('content'));
      if (title) return title;
    }

    return cleanTitle(document.title);
  }

  function detectSalaryFromLd(ld) {
    if (!ld || !ld.baseSalary) return null;
    const bs = ld.baseSalary;
    if (typeof bs === 'string') return cleanText(bs);
    const v = bs.value;
    if (v == null) return null;
    if (typeof v === 'string') return cleanText(v);
    if (typeof v === 'number') return String(v);
    if (typeof v === 'object') {
      if (v.value != null) return String(v.value);
      if (v.minValue != null && v.maxValue != null) return `${v.minValue} - ${v.maxValue}`;
      if (v.minValue != null) return `${v.minValue}+`;
    }
    return null;
  }

  function detectJobDetails() {
    const ld = findJobPostingJsonLd();
    const location = ld && ld.jobLocation && ld.jobLocation.address
      ? cleanText(ld.jobLocation.address.addressLocality) : null;
    const jobType = ld && ld.employmentType
      ? (Array.isArray(ld.employmentType) ? ld.employmentType : [ld.employmentType])
          .map(t => cleanText(t).replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase()))
          .join(', ')
      : null;

    const urlInfo = parseJobUrl(window.location.pathname);

    return {
      company: detectCompany() || (urlInfo && urlInfo.company) || null,
      jobTitle: detectJobTitle() || (urlInfo && urlInfo.jobTitle) || null,
      location: location || firstText([
        '[class*="location"]',
        '[class*="loc-place"]',
        '[class*="jd__location"]',
        '[data-qa*="location"]',
        '[class*="loc-details"]',
        '[class*="loc-new"]'
      ]) || findLabelValue('Location') || (urlInfo && urlInfo.location) || null,
      salary: detectSalaryFromLd(ld) || firstText([
        '[class*="salary"]',
        '[class*="ctc"]',
        '[data-qa*="salary"]',
        '[class*="jd__salary"]',
        '[class*="sal-"]'
      ]) || findLabelValue('Salary') || findLabelValue('Annual Salary') || null,
      jobType: jobType || firstText([
        '[class*="job-type"]',
        '[class*="employment-type"]',
        '[data-qa*="job-type"]',
        '[class*="emp-type"]'
      ]) || findLabelValue('Employment Type') || null
    };
  }

  function parseJobUrl(path) {
    try {
      const m = path.match(/^\/job-listings-([a-z0-9-]+)-(\d{12})$/);
      if (!m) return null;
      const slug = m[1];
      const parts = slug.split('-');

      let expIdx = -1;
      for (let i = 0; i < parts.length - 2; i++) {
        if (/^\d+$/.test(parts[i]) && parts[i + 1] === 'to' && /^\d+$/.test(parts[i + 2])) {
          expIdx = i;
          break;
        }
      }

      const head = expIdx > 0 ? parts.slice(0, expIdx) : parts;
      const LOCATIONS = new Set([
        'pune', 'chennai', 'bengaluru', 'bangalore', 'mumbai', 'delhi', 'new-delhi',
        'gurgaon', 'gurugram', 'noida', 'hyderabad', 'kolkata', 'ahmedabad', 'remote',
        'india', 'coimbatore', 'thiruvananthapuram', 'trivandrum', 'indore', 'jaipur',
        'kerala', 'ncr', 'anywhere', 'karnataka', 'maharashtra', 'tamil-nadu', 'goa'
      ]);

      let locStart = head.length;
      for (let i = 0; i < head.length; i++) {
        if (LOCATIONS.has(head[i])) { locStart = i; break; }
      }
      const location = head.slice(locStart).join(', ').replace(/\b\w/g, c => c.toUpperCase());

      let company = null;
      let jobTitle = null;
      const beforeLoc = head.slice(0, locStart);
      if (beforeLoc.length >= 2) {
        jobTitle = beforeLoc.slice(0, -2).join(' ').replace(/\b\w/g, c => c.toUpperCase());
        company = beforeLoc.slice(-2).join(' ').replace(/\b\w/g, c => c.toUpperCase());
      } else if (beforeLoc.length === 1) {
        jobTitle = beforeLoc[0].replace(/\b\w/g, c => c.toUpperCase());
      }

      return { company, jobTitle, location: location || null };
    } catch (e) {
      return null;
    }
  }

  function isJobLikePage() {
    if (findJobPostingJsonLd()) return true;
    if (detectApplicationForm()) return true;
    const path = window.location.pathname.toLowerCase();
    const title = document.title.toLowerCase();
    const url = window.location.href.toLowerCase();
    const titleHints = /job|career|apply|hiring|vacancy|position|recruit/.test(title + ' ' + url);
    const pathHints = /\/job\/|job-listings|job-detail|jd\/|career|jobs/.test(path);
    return titleHints && pathHints;
  }

  function detectApplicationForm() {
    const forms = document.querySelectorAll('form');
    for (const form of forms) {
      const html = form.innerHTML.toLowerCase();
      if (html.includes('resume') || html.includes('cover letter') ||
          html.includes('apply') || html.includes('application')) {
        return true;
      }
    }
    return false;
  }

  function publishDetails() {
    const details = detectJobDetails();
    const url = window.location.href;
    const hasForm = detectApplicationForm();
    chrome.runtime.sendMessage({
      action: 'pageInfo',
      company: details.company,
      jobTitle: details.jobTitle,
      location: details.location,
      salary: details.salary,
      jobType: details.jobType,
      hasForm: hasForm,
      url: url
    });

    if (isJobLikePage() && (details.jobTitle || details.company)) {
      chrome.runtime.sendMessage({
        action: 'trackJob',
        url: url,
        title: details.jobTitle || document.title,
        company: details.company,
        location: details.location,
        salary: details.salary,
        jobType: details.jobType
      });
    }
  }

  function currentSignature() {
    const d = detectJobDetails();
    return JSON.stringify([d.jobTitle, d.company, d.location, d.salary, d.jobType]);
  }

  let lastSignature = '';
  let broadcastTimer = null;

  function scheduleBroadcast() {
    const sig = currentSignature();
    if (sig === lastSignature) return;
    clearTimeout(broadcastTimer);
    broadcastTimer = setTimeout(() => {
      const sig2 = currentSignature();
      if (sig2 !== lastSignature) {
        lastSignature = sig2;
        publishDetails();
      }
    }, 900);
  }

  function initTracking() {
    scheduleBroadcast();
    let runs = 0;
    const observer = new MutationObserver(() => {
      scheduleBroadcast();
      runs++;
      if (runs > 25) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  }

  // ======= Keyword Highlight =======
  const KW_STYLE_ID = 'jt-kw-style';
  let kwEnabled = false;
  let kwKeywords = ['Remote', 'Ahmedabad'];
  let kwProcessed = new WeakSet();
  let kwObserver = null;
  let kwTimer = null;

  function kwEscapeRegExp(str) {
    return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function kwRegex() {
    const list = kwKeywords.map(kwEscapeRegExp).filter(Boolean);
    if (!list.length) return null;
    return new RegExp('\\b(' + list.join('|') + ')\\b', 'gi');
  }

  function kwInjectStyle() {
    if (document.getElementById(KW_STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = KW_STYLE_ID;
    style.textContent = 'mark.jt-kw{background:#fde68a!important;color:#78350f!important;border-radius:3px;padding:0 2px;font-weight:600;box-shadow:0 0 0 1px #f59e0b;}';
    (document.head || document.documentElement).appendChild(style);
  }

  function kwWrapMatches(node) {
    const re = kwRegex();
    if (!re) return;
    const parent = node.parentNode;
    if (!parent) return;
    const text = node.nodeValue;
    re.lastIndex = 0;
    const matches = [];
    let m;
    while ((m = re.exec(text))) matches.push(m);
    if (!matches.length) return;
    const frag = document.createDocumentFragment();
    let last = 0;
    for (const match of matches) {
      if (match.index > last) frag.appendChild(document.createTextNode(text.slice(last, match.index)));
      const mark = document.createElement('mark');
      mark.className = 'jt-kw';
      mark.textContent = text.slice(match.index, match.index + match[0].length);
      frag.appendChild(mark);
      last = match.index + match[0].length;
    }
    if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
    parent.replaceChild(frag, node);
  }

  function kwWalk() {
    if (!kwEnabled || !kwKeywords.length) return;
    kwInjectStyle();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        const p = node.parentNode;
        if (!p || !p.tagName) return NodeFilter.FILTER_REJECT;
        const tag = p.tagName;
        if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'TEXTAREA' || tag === 'MARK') return NodeFilter.FILTER_REJECT;
        if (p.closest && p.closest('mark.jt-kw')) return NodeFilter.FILTER_REJECT;
        if (kwProcessed.has(node)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(n => { kwProcessed.add(n); kwWrapMatches(n); });
  }

  function kwClear() {
    document.querySelectorAll('mark.jt-kw').forEach(m => {
      const parent = m.parentNode;
      if (parent) parent.replaceChild(document.createTextNode(m.textContent), m);
    });
    kwProcessed = new WeakSet();
  }

  function kwWatch() {
    if (kwObserver) { kwObserver.disconnect(); kwObserver = null; }
    if (!kwEnabled) return;
    kwObserver = new MutationObserver(() => {
      clearTimeout(kwTimer);
      kwTimer = setTimeout(kwWalk, 600);
    });
    kwObserver.observe(document.body || document.documentElement, { childList: true, subtree: true, characterData: true });
  }

  function kwApply() {
    kwClear();
    if (kwEnabled) {
      kwWalk();
      kwWatch();
    } else if (kwObserver) {
      kwObserver.disconnect();
      kwObserver = null;
    }
  }

  function kwInit() {
    chrome.storage.local.get({ jtHighlightEnabled: true, jtKeywords: ['Remote', 'Ahmedabad'] }, data => {
      kwEnabled = data.jtHighlightEnabled !== false;
      kwKeywords = (Array.isArray(data.jtKeywords) && data.jtKeywords.length) ? data.jtKeywords : ['Remote', 'Ahmedabad'];
      kwApply();
    });
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes.jtHighlightEnabled || changes.jtKeywords) {
      if (changes.jtHighlightEnabled) kwEnabled = changes.jtHighlightEnabled.newValue !== false;
      if (changes.jtKeywords) {
        const v = changes.jtKeywords.newValue;
        kwKeywords = (Array.isArray(v) && v.length) ? v : ['Remote', 'Ahmedabad'];
      }
      kwApply();
    }
  });

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'setKeywordHighlight') {
      if (typeof request.enabled === 'boolean') kwEnabled = request.enabled;
      if (Array.isArray(request.keywords)) kwKeywords = request.keywords.map(s => String(s).trim()).filter(Boolean);
      kwApply();
      sendResponse({ success: true, enabled: kwEnabled, keywords: kwKeywords });
      return true;
    }

    if (request.action === 'autofill') {
      const count = autofillProfile(request.profile);
      sendResponse({ success: count > 0, filledCount: count });
      return true;
    }

    if (request.action === 'highlight') {
      const count = highlightFillableFields();
      sendResponse({ success: count > 0, fieldCount: count });
      return true;
    }

    if (request.action === 'clearHighlights') {
      clearHighlights();
      sendResponse({ success: true });
      return true;
    }

    if (request.action === 'getPageInfo') {
      const details = detectJobDetails();
      sendResponse({
        company: details.company,
        jobTitle: details.jobTitle,
        location: details.location,
        salary: details.salary,
        jobType: details.jobType,
        hasForm: detectApplicationForm(),
        url: window.location.href
      });
      return true;
    }

    if (request.action === 'rescan') {
      lastSignature = '';
      scheduleBroadcast();
      sendResponse({ ok: true });
      return true;
    }

    if (request.action === 'getFillableFields') {
      const fields = [];
      document.querySelectorAll('input, textarea, select').forEach(el => {
        const key = matchField(el);
        if (key && PERSONAL_FIELDS[key]) {
          fields.push({
            type: el.tagName.toLowerCase(),
            name: el.getAttribute('name') || el.getAttribute('id') || '',
            fieldType: el.type || 'text',
            profileKey: key,
            label: el.getAttribute('aria-label') || el.getAttribute('placeholder') || key
          });
        }
      });
      sendResponse({ fields });
      return true;
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { initTracking(); kwInit(); });
  } else {
    initTracking();
    kwInit();
  }
})();
