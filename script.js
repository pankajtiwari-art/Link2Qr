"use strict";

const state = {
    qr: null,
    qrLibraryLoaded: false,
    qrLibraryLoading: false,
    currentFormat: "png",
    currentUrl: "",
    logoData: null,
    history: [],
    generationTimer: null,
    settings: {
        foreground: "#000000",
        background: "#FFFFFF",
        size: 512,
        margin: 4,
        errorCorrection: "M",
        dotStyle: "square",
        cornerStyle: "square",
        cornerEyeStyle: "square",
        rotation: 0,
        logoSize: 20,
        logoMargin: 4,
        transparentBackground: false,
        includeMargin: true
    }
};

const elements = {
    urlInput: document.getElementById("urlInput"),
    urlValidation: document.getElementById("urlValidation"),
    pasteButton: document.getElementById("pasteButton"),
    clearButton: document.getElementById("clearButton"),
    quickLinks: document.querySelectorAll(".quick-link"),

    foregroundColor: document.getElementById("foregroundColor"),
    foregroundHex: document.getElementById("foregroundHex"),
    foregroundValue: document.getElementById("foregroundValue"),

    backgroundColor: document.getElementById("backgroundColor"),
    backgroundHex: document.getElementById("backgroundHex"),
    backgroundValue: document.getElementById("backgroundValue"),

    qrSize: document.getElementById("qrSize"),
    qrSizeValue: document.getElementById("qrSizeValue"),

    quietZone: document.getElementById("quietZone"),
    quietZoneValue: document.getElementById("quietZoneValue"),

    errorCorrection: document.getElementById("errorCorrection"),

    resetSettingsButton: document.getElementById("resetSettingsButton"),

    advancedToggle: document.getElementById("advancedToggle"),
    advancedOptions: document.getElementById("advancedOptions"),
    advancedArrow: document.getElementById("advancedArrow"),

    dotStyle: document.getElementById("dotStyle"),
    cornerStyle: document.getElementById("cornerStyle"),
    cornerEyeStyle: document.getElementById("cornerEyeStyle"),

    rotation: document.getElementById("rotation"),
    rotationValue: document.getElementById("rotationValue"),

    logoInput: document.getElementById("logoInput"),
    logoFileName: document.getElementById("logoFileName"),

    logoSize: document.getElementById("logoSize"),
    logoSizeValue: document.getElementById("logoSizeValue"),

    logoMargin: document.getElementById("logoMargin"),
    logoMarginValue: document.getElementById("logoMarginValue"),

    transparentBackground: document.getElementById("transparentBackground"),
    includeMargin: document.getElementById("includeMargin"),

    qrStage: document.getElementById("qrStage"),
    qrPlaceholder: document.getElementById("qrPlaceholder"),
    qrOutput: document.getElementById("qrOutput"),
    qrCanvasWrapper: document.getElementById("qrCanvasWrapper"),
    qrLoading: document.getElementById("qrLoading"),

    formatButtons: document.querySelectorAll(".format-button"),

    downloadButton: document.getElementById("downloadButton"),
    copyButton: document.getElementById("copyButton"),

    formatValue: document.getElementById("formatValue"),
    metaSizeValue: document.getElementById("metaSizeValue"),
    metaErrorValue: document.getElementById("metaErrorValue"),

    historyButton: document.getElementById("historyButton"),
    historyPanel: document.getElementById("historyPanel"),
    clearHistoryButton: document.getElementById("clearHistoryButton"),
    historyList: document.getElementById("historyList"),

    themeButton: document.getElementById("themeButton"),
    themeIcon: document.getElementById("themeIcon"),

    toastContainer: document.getElementById("toastContainer"),

    confirmModal: document.getElementById("confirmModal"),
    cancelModalButton: document.getElementById("cancelModalButton"),
    confirmModalButton: document.getElementById("confirmModalButton"),

    shareModal: document.getElementById("shareModal"),
    closeShareModal: document.getElementById("closeShareModal"),
    shareNativeButton: document.getElementById("shareNativeButton"),
    copyLinkButton: document.getElementById("copyLinkButton")
};

const DEFAULT_SETTINGS = {
    foreground: "#000000",
    background: "#FFFFFF",
    size: 512,
    margin: 4,
    errorCorrection: "M",
    dotStyle: "square",
    cornerStyle: "square",
    cornerEyeStyle: "square",
    rotation: 0,
    logoSize: 20,
    logoMargin: 4,
    transparentBackground: false,
    includeMargin: true
};

function normalizeHex(value) {
    if (!value) {
        return null;
    }

    let hex = value.trim();

    if (!hex.startsWith("#")) {
        hex = "#" + hex;
    }

    if (/^#[0-9a-fA-F]{3}$/.test(hex)) {
        hex =
            "#" +
            hex[1] +
            hex[1] +
            hex[2] +
            hex[2] +
            hex[3] +
            hex[3];
    }

    if (!/^#[0-9a-fA-F]{6}$/.test(hex)) {
        return null;
    }

    return hex.toUpperCase();
}

function isValidUrl(value) {
    if (!value || !value.trim()) {
        return false;
    }

    try {
        const url = new URL(value.trim());

        return (
            url.protocol === "http:" ||
            url.protocol === "https:"
        );
    } catch {
        return false;
    }
}

function normalizeUrl(value) {
    const trimmed = value.trim();

    if (/^https?:\/\//i.test(trimmed)) {
        return trimmed;
    }

    return "https://" + trimmed;
}

function showToast(message, type = "normal") {
    const toast = document.createElement("div");

    toast.className = "toast";

    const icon = document.createElement("span");

    if (type === "success") {
        icon.textContent = "✓";
        icon.style.color = "var(--success)";
    } else if (type === "error") {
        icon.textContent = "!";
        icon.style.color = "var(--danger)";
    } else {
        icon.textContent = "•";
    }

    const text = document.createElement("span");
    text.textContent = message;

    toast.appendChild(icon);
    toast.appendChild(text);

    elements.toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3300);
}

function setValidation(message = "", valid = false) {
    elements.urlValidation.textContent = message;

    if (valid) {
        elements.urlValidation.style.color = "var(--success)";
    } else {
        elements.urlValidation.style.color = "var(--danger)";
    }
}

function setLoading(value) {
    elements.qrLoading.hidden = !value;
}

function updateMeta() {
    elements.formatValue.textContent =
        state.currentFormat.toUpperCase();

    elements.metaSizeValue.textContent =
        `${state.settings.size} × ${state.settings.size}`;

    const percentages = {
        L: "7%",
        M: "15%",
        Q: "25%",
        H: "30%"
    };

    elements.metaErrorValue.textContent =
        percentages[state.settings.errorCorrection] || "15%";
}

function updateSettingLabels() {
    elements.foregroundValue.textContent =
        state.settings.foreground;

    elements.foregroundHex.value =
        state.settings.foreground;

    elements.backgroundValue.textContent =
        state.settings.background;

    elements.backgroundHex.value =
        state.settings.background;

    elements.qrSizeValue.textContent =
        `${state.settings.size} px`;

    elements.quietZoneValue.textContent =
        state.settings.margin;

    elements.rotationValue.textContent =
        `${state.settings.rotation}°`;

    elements.logoSizeValue.textContent =
        `${state.settings.logoSize}%`;

    elements.logoMarginValue.textContent =
        state.settings.logoMargin;

    elements.qrSize.value =
        state.settings.size;

    elements.quietZone.value =
        state.settings.margin;

    elements.rotation.value =
        state.settings.rotation;

    elements.logoSize.value =
        state.settings.logoSize;

    elements.logoMargin.value =
        state.settings.logoMargin;
}

function syncControlsFromState() {
    elements.foregroundColor.value =
        state.settings.foreground;

    elements.foregroundHex.value =
        state.settings.foreground;

    elements.backgroundColor.value =
        state.settings.background;

    elements.backgroundHex.value =
        state.settings.background;

    elements.qrSize.value =
        state.settings.size;

    elements.quietZone.value =
        state.settings.margin;

    elements.errorCorrection.value =
        state.settings.errorCorrection;

    elements.dotStyle.value =
        state.settings.dotStyle;

    elements.cornerStyle.value =
        state.settings.cornerStyle;

    elements.cornerEyeStyle.value =
        state.settings.cornerEyeStyle;

    elements.rotation.value =
        state.settings.rotation;

    elements.logoSize.value =
        state.settings.logoSize;

    elements.logoMargin.value =
        state.settings.logoMargin;

    elements.transparentBackground.checked =
        state.settings.transparentBackground;

    elements.includeMargin.checked =
        state.settings.includeMargin;

    updateSettingLabels();
    updateMeta();
}

function loadSavedSettings() {
    try {
        const saved =
            localStorage.getItem("link2qr_settings");

        if (!saved) {
            syncControlsFromState();
            return;
        }

        const parsed = JSON.parse(saved);

        state.settings = {
            ...DEFAULT_SETTINGS,
            ...parsed
        };

        syncControlsFromState();
    } catch {
        state.settings = {
            ...DEFAULT_SETTINGS
        };

        syncControlsFromState();
    }
}

function saveSettings() {
    try {
        localStorage.setItem(
            "link2qr_settings",
            JSON.stringify(state.settings)
        );
    } catch {
        return;
    }
}

function resetSettings() {
    state.settings = {
        ...DEFAULT_SETTINGS
    };

    state.logoData = null;

    elements.logoInput.value = "";
    elements.logoFileName.textContent =
        "No file selected";

    syncControlsFromState();
    saveSettings();

    if (state.currentUrl) {
        generateQR(state.currentUrl);
    }

    showToast("Settings restored");
}

function updateColor(setting, value, source) {
    const normalized = normalizeHex(value);

    if (!normalized) {
        return false;
    }

    state.settings[setting] = normalized;

    if (source === "color") {
        elements[setting + "Hex"].value = normalized;
    }

    if (source === "hex") {
        elements[setting + "Color"].value = normalized;
    }

    updateSettingLabels();
    saveSettings();

    return true;
}

function scheduleGeneration() {
    clearTimeout(state.generationTimer);

    state.generationTimer = setTimeout(() => {
        const raw = elements.urlInput.value.trim();

        if (!raw) {
            clearQRCode();
            return;
        }

        const normalized =
            normalizeUrl(raw);

        if (!isValidUrl(normalized)) {
            setValidation(
                "Please enter a valid HTTP or HTTPS link."
            );

            return;
        }

        setValidation("Valid URL", true);
        generateQR(normalized);
    }, 280);
}

function clearQRCode() {
    state.currentUrl = "";

    elements.qrCanvasWrapper.innerHTML = "";
    elements.qrOutput.hidden = true;
    elements.qrPlaceholder.hidden = false;

    elements.downloadButton.disabled = true;
    elements.copyButton.disabled = true;

    updateMeta();
}

async function loadQRCodeLibrary() {
    if (state.qrLibraryLoaded && window.QRCodeStyling) {
        return true;
    }

    if (state.qrLibraryLoading) {
        return new Promise(resolve => {
            const check = setInterval(() => {
                if (
                    state.qrLibraryLoaded &&
                    window.QRCodeStyling
                ) {
                    clearInterval(check);
                    resolve(true);
                }
            }, 50);

            setTimeout(() => {
                clearInterval(check);
                resolve(
                    Boolean(window.QRCodeStyling)
                );
            }, 15000);
        });
    }

    state.qrLibraryLoading = true;

    return new Promise(resolve => {
        const existing =
            document.querySelector(
                'script[data-link2qr-library="true"]'
            );

        if (existing) {
            existing.addEventListener(
                "load",
                () => {
                    state.qrLibraryLoaded =
                        Boolean(window.QRCodeStyling);

                    state.qrLibraryLoading = false;

                    resolve(
                        state.qrLibraryLoaded
                    );
                }
            );

            existing.addEventListener(
                "error",
                () => {
                    state.qrLibraryLoading = false;
                    resolve(false);
                }
            );

            return;
        }

        const script =
            document.createElement("script");

        script.src =
            "https://cdn.jsdelivr.net/npm/qr-code-styling@1.8.5/lib/qr-code-styling.js";

        script.async = true;

        script.dataset.link2qrLibrary = "true";

        script.onload = () => {
            state.qrLibraryLoaded =
                Boolean(window.QRCodeStyling);

            state.qrLibraryLoading = false;

            resolve(
                state.qrLibraryLoaded
            );
        };

        script.onerror = () => {
            state.qrLibraryLoading = false;
            resolve(false);
        };

        document.head.appendChild(script);
    });
}

function getQrOptions(url) {
    const background =
        state.settings.transparentBackground
            ? "transparent"
            : state.settings.background;

    const margin =
        state.settings.includeMargin
            ? state.settings.margin
            : 0;

    const dotsOptions = {
        type: state.settings.dotStyle,
        color: state.settings.foreground
    };

    const cornersSquareOptions = {
        type:
            state.settings.cornerStyle ===
            "extra-rounded"
                ? "extra-rounded"
                : state.settings.cornerStyle,
        color: state.settings.foreground
    };

    const cornersDotOptions = {
        type: state.settings.cornerEyeStyle,
        color: state.settings.foreground
    };

    const options = {
        width: state.settings.size,
        height: state.settings.size,
        type: "canvas",
        data: url,
        margin,
        qrOptions: {
            errorCorrectionLevel:
                state.settings.errorCorrection
        },
        dotsOptions,
        cornersSquareOptions,
        cornersDotOptions,
        backgroundOptions: {
            color: background
        },
        imageOptions: {
            hideBackgroundDots: true,
            imageSize:
                state.settings.logoSize / 100,
            margin: state.settings.logoMargin,
            crossOrigin: "anonymous"
        }
    };

    if (state.logoData) {
        options.image = state.logoData;
    }

    return options;
}

async function generateQR(url) {
    state.currentUrl = url;

    setLoading(true);

    elements.qrPlaceholder.hidden = true;
    elements.qrOutput.hidden = false;

    elements.downloadButton.disabled = true;
    elements.copyButton.disabled = true;

    const loaded =
        await loadQRCodeLibrary();

    if (!loaded) {
        setLoading(false);

        elements.qrPlaceholder.hidden = false;
        elements.qrOutput.hidden = true;

        setValidation(
            "QR engine could not load. Check your internet connection."
        );

        showToast(
            "QR engine could not load",
            "error"
        );

        return;
    }

    try {
        elements.qrCanvasWrapper.innerHTML = "";

        if (state.qr) {
            state.qr = null;
        }

        state.qr =
            new window.QRCodeStyling(
                getQrOptions(url)
            );

        state.qr.append(
            elements.qrCanvasWrapper
        );

        setTimeout(() => {
            setLoading(false);

            elements.downloadButton.disabled =
                false;

            elements.copyButton.disabled =
                false;

            updateMeta();

            saveToHistory(url);
        }, 80);
    } catch (error) {
        setLoading(false);

        elements.qrPlaceholder.hidden = false;
        elements.qrOutput.hidden = true;

        showToast(
            "Unable to generate QR code",
            "error"
        );
    }
}

function updateQRCode() {
    if (!state.qr || !state.currentUrl) {
        return;
    }

    try {
        state.qr.update(
            getQrOptions(
                state.currentUrl
            )
        );

        updateMeta();
    } catch {
        generateQR(state.currentUrl);
    }

    saveSettings();
}

function downloadQRCode() {
    if (!state.qr || !state.currentUrl) {
        showToast(
            "Generate a QR code first",
            "error"
        );

        return;
    }

    const extension =
        state.currentFormat === "jpeg"
            ? "jpeg"
            : state.currentFormat;

    try {
        state.qr.download({
            name: "link2qr",
            extension
        });

        showToast(
            `QR downloaded as ${extension.toUpperCase()}`,
            "success"
        );
    } catch {
        showToast(
            "Download failed",
            "error"
        );
    }
}

async function getQRBlob() {
    if (!state.qr) {
        return null;
    }

    const canvas =
        elements.qrCanvasWrapper.querySelector(
            "canvas"
        );

    if (!canvas) {
        return null;
    }

    const requestedType =
        state.currentFormat === "jpeg"
            ? "image/jpeg"
            : state.currentFormat === "webp"
                ? "image/webp"
                : "image/png";

    return new Promise(resolve => {
        canvas.toBlob(
            blob => resolve(blob),
            requestedType,
            0.95
        );
    });
}

async function copyQRCode() {
    if (!state.qr) {
        showToast(
            "Generate a QR code first",
            "error"
        );

        return;
    }

    try {
        const blob =
            await getQRBlob();

        if (!blob) {
            throw new Error();
        }

        if (
            navigator.clipboard &&
            window.ClipboardItem
        ) {
            const item =
                new ClipboardItem({
                    [blob.type]: blob
                });

            await navigator.clipboard.write([
                item
            ]);

            showToast(
                "QR copied to clipboard",
                "success"
            );

            return;
        }

        const canvas =
            elements.qrCanvasWrapper.querySelector(
                "canvas"
            );

        if (!canvas) {
            throw new Error();
        }

        canvas.toBlob(async imageBlob => {
            if (!imageBlob) {
                throw new Error();
            }

            const item =
                new ClipboardItem({
                    [imageBlob.type]: imageBlob
                });

            await navigator.clipboard.write([
                item
            ]);

            showToast(
                "QR copied to clipboard",
                "success"
            );
        });
    } catch {
        showToast(
            "Clipboard image is not supported here",
            "error"
        );
    }
}

async function pasteURL() {
    try {
        const text =
            await navigator.clipboard.readText();

        if (!text) {
            showToast(
                "Clipboard is empty",
                "error"
            );

            return;
        }

        elements.urlInput.value = text.trim();

        const normalized =
            normalizeUrl(
                text.trim()
            );

        if (isValidUrl(normalized)) {
            elements.urlInput.value =
                normalized;

            setValidation(
                "Valid URL",
                true
            );

            generateQR(normalized);
        } else {
            setValidation(
                "Clipboard does not contain a valid URL."
            );
        }
    } catch {
        showToast(
            "Clipboard permission was denied",
            "error"
        );
    }
}

function clearInput() {
    elements.urlInput.value = "";

    setValidation("");

    clearQRCode();

    elements.urlInput.focus();
}

function setFormat(format) {
    state.currentFormat = format;

    elements.formatButtons.forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.format === format
        );
    });

    updateMeta();
}

function openHistory() {
    const hidden =
        elements.historyPanel.hidden;

    elements.historyPanel.hidden = !hidden;

    if (!hidden) {
        return;
    }

    renderHistory();

    requestAnimationFrame(() => {
        elements.historyPanel.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    });
}

function loadHistory() {
    try {
        const saved =
            localStorage.getItem(
                "link2qr_history"
            );

        if (!saved) {
            state.history = [];
            return;
        }

        const parsed =
            JSON.parse(saved);

        state.history =
            Array.isArray(parsed)
                ? parsed
                : [];
    } catch {
        state.history = [];
    }
}

function saveHistoryStorage() {
    try {
        localStorage.setItem(
            "link2qr_history",
            JSON.stringify(
                state.history
            )
        );
    } catch {
        return;
    }
}

function saveToHistory(url) {
    if (!url) {
        return;
    }

    const existing =
        state.history.find(
            item => item.url === url
        );

    if (existing) {
        existing.timestamp =
            Date.now();
    } else {
        state.history.unshift({
            id:
                `${Date.now()}_${Math.random()
                    .toString(36)
                    .slice(2, 9)}`,
            url,
            timestamp:
                Date.now()
        });
    }

    state.history =
        state.history
            .sort(
                (a, b) =>
                    b.timestamp -
                    a.timestamp
            )
            .slice(0, 30);

    saveHistoryStorage();
    renderHistory();
}

function deleteHistoryItem(id) {
    state.history =
        state.history.filter(
            item => item.id !== id
        );

    saveHistoryStorage();
    renderHistory();

    showToast(
        "History item removed"
    );
}

function clearHistory() {
    state.history = [];

    saveHistoryStorage();
    renderHistory();

    closeConfirmModal();

    showToast(
        "QR history cleared",
        "success"
    );
}

function formatHistoryDate(timestamp) {
    const date =
        new Date(timestamp);

    return date.toLocaleString(
        undefined,
        {
            dateStyle: "medium",
            timeStyle: "short"
        }
    );
}

function renderHistory() {
    elements.historyList.innerHTML = "";

    if (!state.history.length) {
        const empty =
            document.createElement("div");

        empty.className =
            "empty-history";

        empty.innerHTML = `
            <div class="empty-history-icon">◌</div>
            <h4>No QR history yet</h4>
            <p>Generated links will appear here.</p>
        `;

        elements.historyList.appendChild(
            empty
        );

        return;
    }

    state.history.forEach(item => {
        const row =
            document.createElement("div");

        row.className =
            "history-item";

        const preview =
            document.createElement("div");

        preview.className =
            "history-preview";

        const previewCanvas =
            document.createElement("canvas");

        preview.appendChild(
            previewCanvas
        );

        const details =
            document.createElement("div");

        details.className =
            "history-details";

        const url =
            document.createElement("div");

        url.className =
            "history-url";

        url.textContent =
            item.url;

        const date =
            document.createElement("div");

        date.className =
            "history-date";

        date.textContent =
            formatHistoryDate(
                item.timestamp
            );

        details.appendChild(url);
        details.appendChild(date);

        const actions =
            document.createElement("div");

        actions.className =
            "history-actions";

        const useButton =
            document.createElement("button");

        useButton.className =
            "history-action";

        useButton.type = "button";
        useButton.textContent = "↗";
        useButton.title =
            "Use this link";

        useButton.addEventListener(
            "click",
            () => {
                elements.urlInput.value =
                    item.url;

                setValidation(
                    "Valid URL",
                    true
                );

                generateQR(item.url);

                window.scrollTo({
                    top: 0,
                    behavior: "smooth"
                });
            }
        );

        const deleteButton =
            document.createElement("button");

        deleteButton.className =
            "history-action";

        deleteButton.type = "button";
        deleteButton.textContent = "×";
        deleteButton.title =
            "Delete";

        deleteButton.addEventListener(
            "click",
            () => {
                deleteHistoryItem(
                    item.id
                );
            }
        );

        actions.appendChild(
            useButton
        );

        actions.appendChild(
            deleteButton
        );

        row.appendChild(preview);
        row.appendChild(details);
        row.appendChild(actions);

        elements.historyList.appendChild(
            row
        );

        createHistoryPreview(
            previewCanvas,
            item.url
        );
    });
}

async function createHistoryPreview(
    canvas,
    url
) {
    if (!window.QRCodeStyling) {
        return;
    }

    try {
        const temp =
            document.createElement(
                "div"
            );

        temp.style.position =
            "absolute";

        temp.style.left =
            "-99999px";

        temp.style.top =
            "-99999px";

        document.body.appendChild(
            temp
        );

        const qr =
            new window.QRCodeStyling({
                width: 120,
                height: 120,
                type: "canvas",
                data: url,
                margin: 4,
                qrOptions: {
                    errorCorrectionLevel: "M"
                },
                dotsOptions: {
                    type: "square",
                    color: "#000000"
                },
                backgroundOptions: {
                    color: "#FFFFFF"
                }
            });

        qr.append(temp);

        setTimeout(() => {
            const generated =
                temp.querySelector(
                    "canvas"
                );

            if (generated) {
                const context =
                    canvas.getContext(
                        "2d"
                    );

                canvas.width =
                    generated.width;

                canvas.height =
                    generated.height;

                context.drawImage(
                    generated,
                    0,
                    0
                );
            }

            temp.remove();
        }, 40);
    } catch {
        return;
    }
}

function openConfirmModal() {
    elements.confirmModal.hidden =
        false;

    document.body.style.overflow =
        "hidden";
}

function closeConfirmModal() {
    elements.confirmModal.hidden =
        true;

    if (elements.shareModal.hidden) {
        document.body.style.overflow =
            "";
    }
}

function openShareModal() {
    if (!state.currentUrl) {
        showToast(
            "Generate a QR code first",
            "error"
        );

        return;
    }

    elements.shareModal.hidden =
        false;

    document.body.style.overflow =
        "hidden";
}

function closeShareModal() {
    elements.shareModal.hidden =
        true;

    if (elements.confirmModal.hidden) {
        document.body.style.overflow =
            "";
    }
}

async function nativeShare() {
    if (!state.currentUrl) {
        return;
    }

    if (
        !navigator.share
    ) {
        showToast(
            "System sharing is not available",
            "error"
        );

        return;
    }

    try {
        await navigator.share({
            title: "Link2QR",
            text: "Check this link",
            url: state.currentUrl
        });
    } catch (error) {
        if (
            error &&
            error.name === "AbortError"
        ) {
            return;
        }

        showToast(
            "Sharing failed",
            "error"
        );
    }
}

async function copyCurrentLink() {
    if (!state.currentUrl) {
        return;
    }

    try {
        await navigator.clipboard.writeText(
            state.currentUrl
        );

        showToast(
            "Link copied",
            "success"
        );

        closeShareModal();
    } catch {
        showToast(
            "Unable to copy link",
            "error"
        );
    }
}

function toggleTheme() {
    const isLight =
        document.body.classList.toggle(
            "light-theme"
        );

    localStorage.setItem(
        "link2qr_theme",
        isLight
            ? "light"
            : "dark"
    );

    elements.themeIcon.textContent =
        isLight
            ? "☼"
            : "◐";
}

function loadTheme() {
    const saved =
        localStorage.getItem(
            "link2qr_theme"
        );

    if (saved === "light") {
        document.body.classList.add(
            "light-theme"
        );

        elements.themeIcon.textContent =
            "☼";
    } else {
        elements.themeIcon.textContent =
            "◐";
    }
}

function handleLogoUpload(event) {
    const file =
        event.target.files &&
        event.target.files[0];

    if (!file) {
        state.logoData = null;

        elements.logoFileName.textContent =
            "No file selected";

        updateQRCode();

        return;
    }

    if (
        !file.type.startsWith(
            "image/"
        )
    ) {
        showToast(
            "Please select an image file",
            "error"
        );

        event.target.value = "";
        return;
    }

    if (
        file.size >
        5 * 1024 * 1024
    ) {
        showToast(
            "Logo must be smaller than 5 MB",
            "error"
        );

        event.target.value = "";
        return;
    }

    const reader =
        new FileReader();

    reader.onload = () => {
        state.logoData =
            reader.result;

        elements.logoFileName.textContent =
            file.name;

        updateQRCode();

        showToast(
            "Logo added",
            "success"
        );
    };

    reader.onerror = () => {
        showToast(
            "Unable to read logo",
            "error"
        );
    };

    reader.readAsDataURL(file);
}

function bindRange(
    element,
    setting,
    callback
) {
    element.addEventListener(
        "input",
        () => {
            state.settings[setting] =
                Number(element.value);

            updateSettingLabels();

            if (callback) {
                callback();
            }

            updateQRCode();
        }
    );
}

function bindEvents() {
    elements.urlInput.addEventListener(
        "input",
        scheduleGeneration
    );

    elements.urlInput.addEventListener(
        "keydown",
        event => {
            if (
                event.key === "Enter"
            ) {
                event.preventDefault();

                const normalized =
                    normalizeUrl(
                        elements.urlInput.value
                    );

                if (
                    isValidUrl(
                        normalized
                    )
                ) {
                    elements.urlInput.value =
                        normalized;

                    setValidation(
                        "Valid URL",
                        true
                    );

                    generateQR(
                        normalized
                    );
                } else {
                    setValidation(
                        "Please enter a valid HTTP or HTTPS link."
                    );
                }
            }
        }
    );

    elements.pasteButton.addEventListener(
        "click",
        pasteURL
    );

    elements.clearButton.addEventListener(
        "click",
        clearInput
    );

    elements.quickLinks.forEach(
        button => {
            button.addEventListener(
                "click",
                () => {
                    const url =
                        button.dataset.example;

                    elements.urlInput.value =
                        url;

                    setValidation(
                        "Valid URL",
                        true
                    );

                    generateQR(url);
                }
            );
        }
    );

    elements.foregroundColor.addEventListener(
        "input",
        () => {
            updateColor(
                "foreground",
                elements.foregroundColor.value,
                "color"
            );

            updateQRCode();
        }
    );

    elements.foregroundHex.addEventListener(
        "change",
        () => {
            if (
                !updateColor(
                    "foreground",
                    elements.foregroundHex.value,
                    "hex"
                )
            ) {
                elements.foregroundHex.value =
                    state.settings.foreground;

                showToast(
                    "Invalid foreground color",
                    "error"
                );

                return;
            }

            updateQRCode();
        }
    );

    elements.backgroundColor.addEventListener(
        "input",
        () => {
            updateColor(
                "background",
                elements.backgroundColor.value,
                "color"
            );

            updateQRCode();
        }
    );

    elements.backgroundHex.addEventListener(
        "change",
        () => {
            if (
                !updateColor(
                    "background",
                    elements.backgroundHex.value,
                    "hex"
                )
            ) {
                elements.backgroundHex.value =
                    state.settings.background;

                showToast(
                    "Invalid background color",
                    "error"
                );

                return;
            }

            updateQRCode();
        }
    );

    bindRange(
        elements.qrSize,
        "size"
    );

    bindRange(
        elements.quietZone,
        "margin"
    );

    elements.errorCorrection.addEventListener(
        "change",
        () => {
            state.settings.errorCorrection =
                elements.errorCorrection.value;

            updateMeta();
            updateQRCode();
        }
    );

    elements.dotStyle.addEventListener(
        "change",
        () => {
            state.settings.dotStyle =
                elements.dotStyle.value;

            updateQRCode();
        }
    );

    elements.cornerStyle.addEventListener(
        "change",
        () => {
            state.settings.cornerStyle =
                elements.cornerStyle.value;

            updateQRCode();
        }
    );

    elements.cornerEyeStyle.addEventListener(
        "change",
        () => {
            state.settings.cornerEyeStyle =
                elements.cornerEyeStyle.value;

            updateQRCode();
        }
    );

    bindRange(
        elements.rotation,
        "rotation"
    );

    bindRange(
        elements.logoSize,
        "logoSize"
    );

    bindRange(
        elements.logoMargin,
        "logoMargin"
    );

    elements.transparentBackground.addEventListener(
        "change",
        () => {
            state.settings.transparentBackground =
                elements.transparentBackground.checked;

            updateQRCode();
        }
    );

    elements.includeMargin.addEventListener(
        "change",
        () => {
            state.settings.includeMargin =
                elements.includeMargin.checked;

            updateQRCode();
        }
    );

    elements.logoInput.addEventListener(
        "change",
        handleLogoUpload
    );

    elements.resetSettingsButton.addEventListener(
        "click",
        resetSettings
    );

    elements.advancedToggle.addEventListener(
        "click",
        () => {
            const expanded =
                elements.advancedToggle.getAttribute(
                    "aria-expanded"
                ) === "true";

            elements.advancedToggle.setAttribute(
                "aria-expanded",
                String(!expanded)
            );

            elements.advancedOptions.hidden =
                expanded;
        }
    );

    elements.formatButtons.forEach(
        button => {
            button.addEventListener(
                "click",
                () => {
                    setFormat(
                        button.dataset.format
                    );
                }
            );
        }
    );

    elements.downloadButton.addEventListener(
        "click",
        downloadQRCode
    );

    elements.copyButton.addEventListener(
        "click",
        copyQRCode
    );

    elements.historyButton.addEventListener(
        "click",
        openHistory
    );

    elements.clearHistoryButton.addEventListener(
        "click",
        openConfirmModal
    );

    elements.cancelModalButton.addEventListener(
        "click",
        closeConfirmModal
    );

    elements.confirmModalButton.addEventListener(
        "click",
        clearHistory
    );

    elements.themeButton.addEventListener(
        "click",
        toggleTheme
    );

    elements.closeShareModal.addEventListener(
        "click",
        closeShareModal
    );

    elements.shareNativeButton.addEventListener(
        "click",
        nativeShare
    );

    elements.copyLinkButton.addEventListener(
        "click",
        copyCurrentLink
    );

    elements.confirmModal.addEventListener(
        "click",
        event => {
            if (
                event.target ===
                elements.confirmModal
            ) {
                closeConfirmModal();
            }
        }
    );

    elements.shareModal.addEventListener(
        "click",
        event => {
            if (
                event.target ===
                elements.shareModal
            ) {
                closeShareModal();
            }
        }
    );

    document.addEventListener(
        "keydown",
        event => {
            if (
                event.key === "Escape"
            ) {
                closeConfirmModal();
                closeShareModal();
            }
        }
    );
}

function initialize() {
    loadSavedSettings();
    loadHistory();
    loadTheme();
    bindEvents();
    renderHistory();
    updateMeta();
    updateSettingLabels();

    const savedUrl =
        localStorage.getItem(
            "link2qr_last_url"
        );

    if (savedUrl && isValidUrl(savedUrl)) {
        elements.urlInput.value =
            savedUrl;

        setValidation(
            "Ready",
            true
        );
    }

    elements.urlInput.addEventListener(
        "change",
        () => {
            const value =
                elements.urlInput.value.trim();

            if (value) {
                localStorage.setItem(
                    "link2qr_last_url",
                    value
                );
            }
        }
    );

    if (
        "serviceWorker" in navigator &&
        window.location.protocol !== "file:"
    ) {
        window.addEventListener(
            "load",
            () => {
                try {
                    navigator.serviceWorker.register(
                        "service-worker.js"
                    ).catch(() => {});
                } catch {}
            }
        );
    }
}

initialize();
