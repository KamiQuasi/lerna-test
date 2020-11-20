import PFElement from "../../pfelement/dist/pfelement.js";
import PfeIcon from "../../pfe-icon/dist/pfe-icon.js";
import PfeAvatar from "../../pfe-avatar/dist/pfe-avatar.js";
import "../../pfe-progress-indicator/dist/pfe-progress-indicator.js";

/**
 * Closest Polyfill
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Element/closest#Polyfill
 */
if (!Element.prototype.matches) {
  Element.prototype.matches = Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector;
}

if (!Element.prototype.closest) {
  Element.prototype.closest = function(s) {
    var el = this;

    do {
      if (Element.prototype.matches.call(el, s)) return el;
      el = el.parentElement || el.parentNode;
    } while (el !== null && el.nodeType === 1);
    return null;
  };
}

/**
 * Debounce helper function
 * @see https://davidwalsh.name/javascript-debounce-function
 *
 * @param {function} func Function to be debounced
 * @param {number} delay How long until it will be run
 * @param {boolean} immediate Whether it should be run at the start instead of the end of the debounce
 */
function debounce(func, delay, immediate = false) {
  var timeout;
  return function() {
    var context = this,
      args = arguments;
    var later = function() {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    var callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, delay);
    if (callNow) func.apply(context, args);
  };
}

// Config for mutation observer to see if things change inside of the component
const lightDomObserverConfig = {
  characterData: true,
  attributes: true,
  subtree: true,
  childList: true
};

class PfeNavigation extends PFElement {
  static get tag() {
    return "pfe-navigation";
  }

  get schemaUrl() {
    return "pfe-navigation.json";
  }

  get templateUrl() {
    return "pfe-navigation.html";
  }

  get styleUrl() {
    return "pfe-navigation.scss";
  }

  // static get events() {
  //   return {
  //   };
  // }

  // Declare the type of this component
  static get PfeType() {
    return PFElement.PfeTypes.Combo;
  }

  static get observedAttributes() {
    return [`${this.tag}-open-toggle`];
  }

  constructor() {
    super(PfeNavigation, { type: PfeNavigation.PfeType });

    // Set pointers to commonly used elements
    this._mobileToggle = this.shadowRoot.getElementById("mobile__button");
    this._menuDropdownXs = this.shadowRoot.getElementById("mobile__dropdown");
    this._menuDropdownMd = this.shadowRoot.getElementById("pfe-navigation__menu-wrapper");
    this._secondaryLinksWrapper = this.shadowRoot.getElementById("pfe-navigation__secondary-links-wrapper");
    this._searchToggle = this.shadowRoot.getElementById("secondary-links__button--search");
    this._searchSlot = this.shadowRoot.getElementById("search-slot");
    this._searchSpotXs = this.shadowRoot.getElementById("pfe-navigation__search-wrapper--xs");
    this._searchSpotMd = this.shadowRoot.getElementById("pfe-navigation__search-wrapper--md");
    this._allRedHatToggle = this.shadowRoot.getElementById("secondary-links__button--all-red-hat");
    this._allRedHatToggleBack = this.shadowRoot.querySelector(`#${this.tag}__all-red-hat-toggle--back`);
    this._customLinksSlot = this.shadowRoot.getElementById("pfe-navigation--custom-links");
    this._siteSwitcherWrapperOuter = this.shadowRoot.querySelector(`.${this.tag}__all-red-hat-wrapper`);
    this._siteSwitcherWrapper = this.shadowRoot.querySelector(".pfe-navigation__all-red-hat-wrapper__inner");
    this._siteSwitchLoadingIndicator = this.shadowRoot.querySelector("#site-loading");
    this._userMenuToggle = this.shadowRoot.getElementById("secondary-links__button--user-menu");
    this._userMenuToggleBack = this.shadowRoot.querySelector(`#${this.tag}__user-menu-toggle--back`);
    this._userMenuWrapperOuter = this.shadowRoot.querySelector(`.${this.tag}__user-menu-wrapper`);
    this._userMenuWrapper = this.shadowRoot.querySelector(`.${this.tag}__user-menu-wrapper__inner`);
    this._overlay = this.shadowRoot.querySelector(`.${this.tag}__overlay`);
    this._stickyHandler = this._stickyHandler.bind(this);

    // Set default breakpoints to null (falls back to CSS)
    this.menuBreakpoints = {
      secondaryLinks: null,
      mainMenu: null
    };

    // Initializing vars on the instance of this navigation element
    this.windowInnerWidth = null;
    this.mainMenuButtonVisible = null;
    this.secondaryLinksSectionCollapsed = null;
    this._debouncedPreResizeAdjustments = null;
    this._debouncedPostResizeAdjustments = null;
    this.logoSpaceNeeded = null;
    this._currentMobileDropdown = null;
    // Used to track previous state for resize adjustments
    this._wasMobileMenuButtonVisible = null;
    this._wasSecondaryLinksSectionCollapsed = null;

    // Ensure 'this' is tied to the component object in these member functions
    this.isOpen = this.isOpen.bind(this);
    this._changeNavigationState = this._changeNavigationState.bind(this);
    this.isMobileMenuButtonVisible = this.isMobileMenuButtonVisible.bind(this);
    this.isSecondaryLinksSectionCollapsed = this.isSecondaryLinksSectionCollapsed.bind(this);
    this._processSearchSlotChange = this._processSearchSlotChange.bind(this);
    this._processLightDom = this._processLightDom.bind(this);
    this._toggleMobileMenu = this._toggleMobileMenu.bind(this);
    this._toggleSearch = this._toggleSearch.bind(this);
    this._toggleAllRedHat = this._toggleAllRedHat.bind(this);
    this._toggleUserMenu = this._toggleUserMenu.bind(this);
    this._allRedHatToggleBackClickHandler = this._allRedHatToggleBackClickHandler.bind(this);
    this._userMenuToggleBackClickHandler = this._userMenuToggleBackClickHandler.bind(this);
    this._dropdownItemToggle = this._dropdownItemToggle.bind(this);
    this._addMenuBreakpoints = this._addMenuBreakpoints.bind(this);
    this._collapseMainMenu = this._collapseMainMenu.bind(this);
    this._collapseSecondaryLinks = this._collapseSecondaryLinks.bind(this);
    this._getDropdownHeights = this._getDropdownHeights.bind(this);
    this._moveSearchSlot = this._moveSearchSlot.bind(this);
    this._postResizeAdjustments = this._postResizeAdjustments.bind(this);
    this._generalKeyboardListener = this._generalKeyboardListener.bind(this);
    this._overlayClickHandler = this._overlayClickHandler.bind(this);

    // Handle updates to slotted search content
    this._searchSlot.addEventListener("slotchange", this._processSearchSlotChange);

    // Setup mutation observer to watch for content changes
    this._observer = new MutationObserver(this._processLightDom);

    // close All Red Hat menu and go back to mobile menu
    this._allRedHatToggleBack.addEventListener("click", this._allRedHatToggleBackClickHandler);

    // close User Menu and go back to mobile menu
    this._userMenuToggleBack.addEventListener("click", this._userMenuToggleBackClickHandler);

    // ensure we close the whole menu and hide the overlay when the overlay is clicked
    this._overlay.addEventListener("click", this._overlayClickHandler);
  }

  connectedCallback() {
    super.connectedCallback();
    // If you need to initialize any attributes, do that here

    this._processLightDom();
    this._requestSiteSwitcher();

    this._observer.observe(this, lightDomObserverConfig);

    this.search = this.querySelector(`[slot="${this.tag}--search"]`);
    this.customlinks = this.querySelector(`[slot="${this.tag}--customlinks"]`);
    this.user = top.document.querySelector("cpx-user");

    const preResizeAdjustments = () => {
      this.classList.add("pfe-navigation--is-resizing");
    };
    this._debouncedPreResizeAdjustments = debounce(preResizeAdjustments, 150, true);
    window.addEventListener("resize", this._debouncedPreResizeAdjustments);
    this._debouncedPostResizeAdjustments = debounce(this._postResizeAdjustments, 150);
    window.addEventListener("resize", this._debouncedPostResizeAdjustments, { passive: true });
    this._wasMobileMenuButtonVisible = this.isMobileMenuButtonVisible();
    this._wasSecondaryLinksSectionCollapsed = this.isSecondaryLinksSectionCollapsed();

    // Initial position of this element from the top of the screen
    this.top = this.getBoundingClientRect().top || 0;

    // If the nav is set to sticky, run the sticky handler and attach scroll event to window
    if (this.hasAttribute("pfe-sticky") && this.getAttribute("pfe-sticky") != "false") {
      // Run the sticky check on first page load
      this._stickyHandler();

      // Attach the scroll event to the window
      window.addEventListener("scroll", () => {
        window.requestAnimationFrame(() => {
          this._stickyHandler();
        });
      });
    }
  }

  disconnectedCallback() {
    // @todo Remove all listeners to be thorough!
    window.removeEventListener("resize", this._debouncedPreResizeAdjustments);
    window.removeEventListener("resize", this._debouncedPostResizeAdjustments);
    this._slot.removeEventListener("slotchange", this._processSearchSlotChange);
    this._overlay.removeEventListener("click", this._overlayClickHandler);
    this._mobileToggle.removeEventListener("click", this._toggleMobileMenu);
    this._searchToggle.removeEventListener("click", this._toggleSearch);
    this._allRedHatToggle.removeEventListener("click", this._toggleAllRedHat);
    this._allRedHatToggleBack.removeEventListener("click", this._allRedHatToggleBackClickHandler);
    this._userMenuToggle.removeEventListener("click", this._toggleUserMenu);
    this._userMenuToggleBack.removeEventListener("click", this._userMenuToggleBackClickHandler);
    this.removeEventListener("keydown", this._generalKeyboardListener);

    if (this.hasAttribute("pfe-sticky") && this.getAttribute("pfe-sticky") != "false") {
      window.removeEventListener("scroll", () => {
        window.requestAnimationFrame(() => {
          this._stickyHandler();
        });
      });
    }

    // log focused element - for development only
    // @todo: change anon function to be a property on the object so we can refer to it when we add the listener and remove it
    // this.shadowRoot.removeEventListener(
    //   "focusin",
    //   function(event) {
    //     console.log("focused: ", event.target);
    //   },
    //   true
    // );

    // Remove dropdown listeners
    const dropdownButtons = this.shadowRoot.querySelectorAll(".pfe-navigation__menu-link--has-dropdown");
    for (let index = 0; index < dropdownButtons.length; index++) {
      const dropdownButton = dropdownButtons[index];
      dropdownButton.removeEventListener("click", this._dropdownItemToggle);
    }
  }

  // Process the attribute change
  attributeChangedCallback(attr, oldValue, newValue) {
    super.attributeChangedCallback(attr, oldValue, newValue);
  }

  /**
   * Utility function that is used to display more console logging in non-prod env
   */
  _isDevelopment() {
    return document.domain === "localhost";
  }

  /**
   * Utility function that is used to display more console logging in non-prod env to debug focus state
   * for development only, should remove for final product
   * @param {boolean} debugFocus Optional. console log focused element
   */
  // @todo: decide if we should keep this debug feature in final product
  _isDebugFocus(debugFocus = false) {
    return debugFocus;
  }

  /**
   * Checks to see if anything in the menu, or if a specific part of it is open
   * @param {string} toggleId Optional. Check if specific part of menu is open, if blank will check if anything is open
   * @return {boolean}
   */
  isOpen(toggleId) {
    const openToggleId = this.getAttribute(`${this.tag}-open-toggle`);
    if (openToggleId) {
      if (typeof toggleId === "undefined") {
        // Something is open, and a toggleId wasn't set
        return true;
      }
      if (openToggleId.startsWith("main-menu") && toggleId === "mobile__button") {
        return true;
      }
      if (
        openToggleId === "secondary-links__button--all-red-hat" &&
        toggleId === "mobile__button" &&
        this.isSecondaryLinksSectionCollapsed()
      ) {
        return true;
      }

      // Only checks for prefix so if main-menu is queried and main-menu__dropdown--Link-Name is open it still evaluates as true
      // This prevents the main-menu toggle shutting at mobile when a sub-section is opened
      return toggleId === openToggleId;
    }

    return false;
  }

  /**
   * Use for elements that stop being dropdowns
   *
   * @param {object} toggleElement Toggle Button DOM Element
   * @param {object} dropdownWrapper Dropdown wrapper DOM element
   * @param {boolean} debugNavigationState
   */
  _removeDropdownAttributes(toggleElement, dropdownWrapper, debugNavigationState = false) {
    let toggleId = null;

    if (toggleElement) {
      toggleId = toggleElement.getAttribute("id");
      toggleElement.removeAttribute("aria-expanded");
      toggleElement.parentElement.classList.remove("pfe-navigation__menu-item--open");
    }

    if (debugNavigationState) {
      console.log("_removeDropdownAttributes", toggleId, dropdownWrapper.getAttribute("id"));
    }

    if (dropdownWrapper) {
      dropdownWrapper.removeAttribute("aria-hidden");
      dropdownWrapper.classList.remove("pfe-navigation__dropdown-wrapper--invisible");
      dropdownWrapper.style.removeProperty("height");
    }
  }

  /**
   * Sets attributes for an open element, but DOES NOT update navigation state
   * Only use to update DOM State to reflect nav state
   * Almost all open/close actions should go through this._changeNavigationState, not this function
   *
   * @param {object} toggleElement Toggle Button DOM Element
   * @param {object} dropdownWrapper Dropdown wrapper DOM element
   * @param {boolean} debugNavigationState
   */
  _addOpenDropdownAttributes(toggleElement, dropdownWrapper, debugNavigationState = false) {
    // Toggle Button DOM Element ID attribute
    let toggleId = null;
    // Dropdown wrapper DOM element ID attribute
    let dropdownWrapperId = null;

    if (toggleElement) {
      toggleId = toggleElement.getAttribute("id");
    }
    if (dropdownWrapper) {
      dropdownWrapperId = dropdownWrapper.getAttribute("id");
    }
    if (debugNavigationState) {
      console.log("_addOpenDropdownAttributes", toggleId, dropdownWrapper.getAttribute("id"));
    }

    if (toggleElement) {
      toggleElement.setAttribute("aria-expanded", "true");
      toggleElement.setAttribute("aria-controls", dropdownWrapperId);

      // Main menu specific actions
      if (toggleId.startsWith("main-menu__")) {
        toggleElement.parentElement.classList.add("pfe-navigation__menu-item--open");
      }
    }

    const setHeight = (height, dropdownForHeight) => {
      if (parseInt(dropdownWrapper.dataset.height) > 50) {
        dropdownWrapper.style.setProperty("height", `${dropdownWrapper.dataset.height}px`);
      }
    };

    if (dropdownWrapper) {
      dropdownWrapper.setAttribute("aria-hidden", "false");
      dropdownWrapper.classList.remove("pfe-navigation__dropdown-wrapper--invisible");

      // Updating height via JS so we can animate it for CSS transitions
      // All Red Hat toggle uses a slide mechanic at mobile
      if (toggleId !== "secondary-links__button--all-red-hat") {
        setHeight(dropdownWrapper, dropdownWrapper.dataset.height);
      } else {
        if (!this.isSecondaryLinksSectionCollapsed()) {
          setHeight(dropdownWrapper, dropdownWrapper.dataset.height);
        }
      }
    }
  }

  /**
   * Sets attributes for a closed element, but DOES NOT update navigation state
   * Only use to update DOM State to reflect nav state
   * Almost all open/close actions should go through this._changeNavigationState, not this function
   *
   * @param {object} toggleElement Toggle Button DOM Element
   * @param {object} dropdownWrapper Dropdown wrapper DOM element
   * @param {number} invisibleDelay Delay on visibility hidden style, in case we need to wait for an animation
   * @param {boolean} debugNavigationState
   */
  _addCloseDropdownAttributes(toggleElement, dropdownWrapper, invisibleDelay = 0, debugNavigationState = false) {
    // Toggle Button DOM Element ID attribute
    let toggleId = null;
    // Dropdown wrapper DOM element ID attribute
    let dropdownWrapperId = null;

    if (toggleElement) {
      toggleId = toggleElement.getAttribute("id");
    }
    if (dropdownWrapper) {
      dropdownWrapperId = dropdownWrapper.getAttribute("id");
    }
    if (debugNavigationState) {
      console.log("_closeDropdown", toggleId, dropdownWrapper.getAttribute("id"));
    }
    if (toggleElement) {
      toggleElement.setAttribute("aria-expanded", "false");
      toggleElement.setAttribute("aria-controls", dropdownWrapperId);
      // Main menu specific code
      if (toggleId.startsWith("main-menu")) {
        toggleElement.parentElement.classList.remove("pfe-navigation__menu-item--open");
      }
    }

    if (dropdownWrapper) {
      dropdownWrapper.style.removeProperty("height");
      // Sometimes need a delay visibility: hidden so animation can finish
      window.setTimeout(
        () => dropdownWrapper.classList.add("pfe-navigation__dropdown-wrapper--invisible"),
        invisibleDelay // Should be slightly longer than the animation time
      );
      dropdownWrapper.setAttribute("aria-hidden", "true");
    }
  }

  /**
   * Create dash delimited string with no special chars for use in HTML attributes
   * @param {string}
   * @return {string} String that can be used as a class or ID (no spaces or special chars)
   */
  _createMachineName(text) {
    return (
      text
        // Get rid of special characters
        .replace(/[!\"#$%&'\(\)\*\+,\.\/:;<=>\?\@\[\\\]\^`\{\|\}~]/g, "")
        // Get rid of extra space
        .trim()
        // Replace remaining single spaces between words with -
        .replace(/[\s\-]+/g, "-")
    );
  }

  /**
   * Figures out if secondary links are collapsed
   * @param {boolean} forceRecalculation
   * @returns {boolean}
   */
  isSecondaryLinksSectionCollapsed(forceRecalculation) {
    // Trying to avoid running getComputedStyle too much by caching iton the web component object
    if (
      forceRecalculation ||
      this.secondaryLinksSectionCollapsed === null ||
      window.innerWidth !== this.windowInnerWidth
    ) {
      if (this._isDevelopment()) {
        console.log(`${this.tag}: isSecondaryLinksSectionCollapsed recalculated`);
      }
      this.secondaryLinksSectionCollapsed =
        window.getComputedStyle(this._secondaryLinksWrapper, false).flexDirection === "column";

      // Update the stored windowInnerWidth variable so we don't recalculate for no reason
      if (window.innerWidth !== this.windowInnerWidth) {
        this.windowInnerWidth = window.innerWidth;
        // Update the other layout state function, but avoid infinite loop :P
        this.isMobileMenuButtonVisible(true);
      }
    }
    return this.secondaryLinksSectionCollapsed;
  }

  /**
   * Figures out if the mobile menu toggle (aka hamburger icon) is visible
   * @param {boolean} forceRecalculation
   * @returns {boolean}
   */
  isMobileMenuButtonVisible(forceRecalculation) {
    // Trying to avoid running getComputedStyle too much by caching iton the web component object
    if (forceRecalculation || this.mainMenuButtonVisible === null || window.innerWidth !== this.windowInnerWidth) {
      if (this._isDevelopment()) {
        console.log(`${this.tag}: isMobileMenuButtonVisible recalculated`);
      }
      this.mainMenuButtonVisible = window.getComputedStyle(this._mobileToggle, false).display !== "none";

      // Update the stored windowInnerWidth variable so we don't recalculate for no reason
      if (window.innerWidth !== this.windowInnerWidth) {
        this.windowInnerWidth = window.innerWidth;
        this.isSecondaryLinksSectionCollapsed(true);
      }
    }
    return this.mainMenuButtonVisible;
  }

  /**
   * Sets this._currentMobileDropdown depending on breakpoint
   */
  _setCurrentMobileDropdown() {
    if (this.isMobileMenuButtonVisible()) {
      if (this.isSecondaryLinksSectionCollapsed()) {
        this._currentMobileDropdown = this._menuDropdownXs;
        this._currentMobileDropdown.classList.add("pfe-navigation__mobile-dropdown");
        this._menuDropdownMd.classList.remove("pfe-navigation__mobile-dropdown");
      } else {
        this._currentMobileDropdown = this._menuDropdownMd;
        this._currentMobileDropdown.classList.add("pfe-navigation__mobile-dropdown");
        this._menuDropdownXs.classList.remove("pfe-navigation__mobile-dropdown");
      }
    } else {
      this._currentMobileDropdown = null;
      this._menuDropdownXs.classList.remove("pfe-navigation__mobile-dropdown");
      this._menuDropdownMd.classList.remove("pfe-navigation__mobile-dropdown");
    }
  }

  /**
   * Get the dropdownId based on the toggleId
   * @param {string} toggleId ID of a toggle button
   * @return {string} ID of the corresponding dropdown
   */
  _getDropdownId(toggleId) {
    let dropdownId = null;
    if (toggleId.startsWith("secondary-links")) {
      switch (toggleId) {
        case "secondary-links__button--search":
          dropdownId = "pfe-navigation__search-wrapper--md";
          break;
        case "secondary-links__button--all-red-hat":
          dropdownId = "secondary-links__dropdown--all-red-hat";
          break;
        case "secondary-links__button--user-menu":
          dropdownId = "secondary-links__dropdown--user-menu";
          break;
      }
    } else if (toggleId === "mobile__button") {
      if (this.isMobileMenuButtonVisible()) {
        dropdownId = this._currentMobileDropdown.getAttribute("id");
      } else {
        return null;
      }
    } else if (toggleId.startsWith("main-menu")) {
      dropdownId = this.shadowRoot.getElementById(toggleId).parentElement.dataset.dropdownId;
    }

    if (dropdownId) {
      return dropdownId;
    }
    console.error(`${this.tag}: Could not find corresponding dropdown for #${toggleId}`);
  }

  /**
   * Manages all dropdowns and ensures only one is open at a time
   * @param {string} toggleId Id to use in pfe-navigation-open-toggle param
   * @param {string} toState Optional, use to set the end state as 'open' or 'close', instead of toggling the current state
   * @return {boolean} True if the final state is open, false if closed
   */
  _changeNavigationState(toggleId, toState) {
    const debugNavigationState = false; // Should never be committed as true

    if (debugNavigationState) {
      console.log("_changeNavigationState", toggleId, toState);
    }
    const isOpen = this.isOpen(toggleId);
    // Set toState param to go to opposite of current state if toState isn't set
    if (typeof toState === "undefined") {
      toState = isOpen ? "close" : "open";
    }
    const dropdownId = this._getDropdownId(toggleId);
    const currentlyOpenToggleId = this.getAttribute(`${this.tag}-open-toggle`);
    const shadowDomOuterWrapper = this.shadowRoot.getElementById("pfe-navigation__wrapper");
    const toggleElementToToggle = this.shadowRoot.getElementById(toggleId);

    /**
     * Local utility function to open a dropdown (shouldn't be used outside of parent function)
     * @param {object} toggleElement Toggle Button DOM Element
     * @param {object} dropdownWrapper Dropdown wrapper DOM element
     */
    const _openDropdown = (toggleElement, dropdownWrapper) => {
      const toggleIdToOpen = toggleElement.getAttribute("id");
      if (debugNavigationState) {
        console.log("openDropdown", toggleIdToOpen, dropdownWrapper.getAttribute("id"));
      }

      this._addOpenDropdownAttributes(toggleElement, dropdownWrapper, debugNavigationState);

      this.setAttribute(`${this.tag}-open-toggle`, toggleIdToOpen);

      // Show overlay
      this._overlay.hidden = false;
    };

    /**
     * Local utility function to close a dropdown (shouldn't be used outside of parent function)
     * @param {object} toggleElement Toggle Button DOM Element
     * @param {object} dropdownWrapper Dropdown wrapper DOM element
     * @param {boolean} backOut If we're in a subdropdown, should we keep the parent one open, false will close all dropdowns
     */
    const _closeDropdown = (toggleElement, dropdownWrapper, backOut = true) => {
      const toggleIdToClose = toggleElement.getAttribute("id");
      if (debugNavigationState) {
        console.log("_closeDropdown", toggleIdToClose, dropdownWrapper.getAttribute("id"), backOut);
      }

      this._addCloseDropdownAttributes(toggleElement, dropdownWrapper, 300, debugNavigationState);

      let closed = false;
      if (backOut) {
        if (toggleIdToClose.startsWith("main-menu") && this.isMobileMenuButtonVisible()) {
          // Back out to main-menu
          _openDropdown(this._mobileToggle, this.shadowRoot.getElementById("mobile__dropdown"));
          closed = true;
        } else if (
          this.isSecondaryLinksSectionCollapsed() &&
          toggleIdToClose === "secondary-links__button--all-red-hat"
        ) {
          _openDropdown(this._mobileToggle, this.shadowRoot.getElementById("mobile__dropdown"));
          closed = true;
        }
      }

      // If we weren't able to back out, close everything by removing the open-toggle attribute
      if (!closed) {
        this.removeAttribute(`${this.tag}-open-toggle`, "");
        this._overlay.hidden = true;
      }
    };

    // Shut any open dropdowns before we open any other
    if (currentlyOpenToggleId) {
      const openToggle = this.shadowRoot.getElementById(currentlyOpenToggleId);

      // Figure out we have a parent/child dropdown relationship
      // Main Menu / Mobile Menu relationship
      const toggleIdStartsWithMainMenu = toggleId.startsWith("main-menu");
      const openingMainMenuAndMobileToggleOpen =
        toggleIdStartsWithMainMenu && currentlyOpenToggleId === "mobile__button";
      // All Red Hat is only a child 'dropdown' at mobile
      const openingAllRedHatAndIsMobileAndMobileToggleOpen =
        toggleId === "secondary-links__button--all-red-hat" &&
        this.isSecondaryLinksSectionCollapsed() &&
        currentlyOpenToggleId === "mobile__button";

      if (debugNavigationState) {
        console.log(
          "Parent/Child dropdown situation?",
          openingMainMenuAndMobileToggleOpen,
          openingAllRedHatAndIsMobileAndMobileToggleOpen
        );
      }

      // Don't close a parent dropdown if we're opening the child
      if (!openingMainMenuAndMobileToggleOpen && !openingAllRedHatAndIsMobileAndMobileToggleOpen) {
        const openDropdownId = this._getDropdownId(currentlyOpenToggleId);
        _closeDropdown(openToggle, this.shadowRoot.getElementById(openDropdownId));
      }
    }

    if (toState !== "close" && toState !== "open") {
      console.error(`${this.tag}: toState param was set to ${toState}, can only be 'close' or 'open'`);
    }

    // Update the element we came to update
    if (toState === "close") {
      _closeDropdown(toggleElementToToggle, this.shadowRoot.getElementById(dropdownId));
    } else if (toState === "open") {
      _openDropdown(toggleElementToToggle, this.shadowRoot.getElementById(dropdownId));
    }

    // Clone state attribute inside of Shadow DOM to avoid compound :host() selectors
    shadowDomOuterWrapper.setAttribute(`${this.tag}-open-toggle`, this.getAttribute(`${this.tag}-open-toggle`));
    return toState === "open";
  } // end _changeNavigationState

  // Add a class to component wrapper if we have a search slot
  _processSearchSlotChange() {
    if (this.has_slot("pfe-navigation--search")) {
      this.classList.add("pfe-navigation--has-search");
    } else {
      this.classList.remove("pfe-navigation--has-search");
    }
  }

  /**
   * Handle initialization or changes in light DOM
   * Clone them into the shadowRoot
   * @param {array} mutationList Provided by mutation observer
   */
  // @todo: processLightDom seems to be firing twice, need to look into this and see whether that is okay or if it needs to be fixed, seems like it is not a good thing but not sure if it is avoidable or not
  _processLightDom(mutationList) {
    // If we're mutating because an attribute on the web component starting with pfe- changed, don't reprocess dom
    let cancelLightDomProcessing = true;
    let componentClassesChange = false;
    const cancelLightDomProcessingTags = ["PFE-NAVIGATION", "PFE-ICON"];

    if (mutationList) {
      for (let index = 0; index < mutationList.length; index++) {
        const mutationItem = mutationList[index];
        if (mutationItem.type === "characterData") {
          // Process text changes
          cancelLightDomProcessing = false;
        }
        // Slotted tags and their children shouldn't cause lightDomProcessing
        else if (!mutationItem.target.closest("[slot]") && !mutationItem.target.hasAttribute("slot")) {
          if (!cancelLightDomProcessingTags.includes(mutationItem.target.tagName)) {
            if (mutationItem.attributeName && !mutationItem.attributeName.startsWith("pfe-")) {
              // If it's a pfe- attribute, assume we don't need to process the light dom
              cancelLightDomProcessing = false;
            }
          } else if (
            mutationItem.target.tagName === "PFE-NAVIGATION" &&
            mutationItem.type === "attributes" &&
            mutationItem.attributeName === "class"
          ) {
            componentClassesChange = true;
          }
        }
      }
    } else {
      // If there isn't a mutationList it's because this is on connectedCallback
      cancelLightDomProcessing = false;
    }

    // Preventing issues in IE11 & Edge
    if (window.ShadyCSS) {
      this._observer.disconnect();
    }

    // Handle class updates to the parent component
    // Copying them to shadow DOM to avoid compound :host() selectors
    if (componentClassesChange) {
      const shadowDomOuterWrapper = this.shadowRoot.getElementById("pfe-navigation__wrapper");
      shadowDomOuterWrapper.setAttribute("class", `pfe-navigation__wrapper ${this.getAttribute("class")}`);
    }

    if (cancelLightDomProcessing) {
      // Reconnecting mutationObserver for IE11 & Edge
      if (window.ShadyCSS) {
        this._observer.observe(this, lightDomObserverConfig);
      }
      return;
    }

    // Begins the wholesale replacement of the shadowDOM -------------------------------
    if (this._isDevelopment()) {
      // Leaving this so we spot when the shadowDOM is being replaced when it shouldn't be
      // But don't want it firing in prod
      console.log(`${this.tag} _processLightDom: replacing shadow DOM`, mutationList);

      // set to true to log focused element, set to false to stop logging focused element, for development only, should remove for final product
      // @todo: change anon function to be a property on the object so we can refer to it when we add the listener and remove it
      // if (this._isDebugFocus(false)) {
      //   // log focused element
      //   this.shadowRoot.addEventListener(
      //     "focusin",
      //     function(event) {
      //       console.log("focused: ", event.target);
      //     },
      //     true
      //   );
      // }
    }
    // @todo look into only replacing markup that changed via mutationList
    const shadowWrapper = this.shadowRoot.getElementById("pfe-navigation__wrapper");
    const shadowMenuWrapper = this.shadowRoot.getElementById("pfe-navigation__menu-wrapper");
    const newShadowMenuWrapper = document.createElement("nav");
    const shadowLogo = this.shadowRoot.getElementById("pfe-navigation__logo-wrapper");
    const lightLogo = this.querySelector("#pfe-navigation__logo-wrapper");
    const lightMenu = this.querySelector("#pfe-navigation__menu");

    // Add attributres we need on the shadow DOM menu wrapper
    newShadowMenuWrapper.setAttribute("id", "pfe-navigation__menu-wrapper");
    newShadowMenuWrapper.classList.add("pfe-navigation__menu-wrapper");

    // Add the logo to the correct part of the shadowDom
    if (lightLogo) {
      if (shadowLogo) {
        shadowWrapper.replaceChild(lightLogo.cloneNode(true), shadowLogo);
      } else {
        shadowWrapper.prepend(lightLogo.cloneNode(true));
      }
    }

    // Copy light DOM menu into new wrapper, to be put in shadow DOM after manipulations
    newShadowMenuWrapper.append(lightMenu.cloneNode(true));

    // Add menu dropdown toggle behavior
    const dropdowns = newShadowMenuWrapper.querySelectorAll(".pfe-navigation__dropdown");
    for (let index = 0; index < dropdowns.length; index++) {
      const dropdown = dropdowns[index];
      const dropdownLink = dropdown.parentElement.querySelector(".pfe-navigation__menu-link");

      // Convert dropdown links into buttons
      const dropdownButton = document.createElement("button");

      // Move over or add important attributes and content
      dropdownButton.setAttribute("class", dropdownLink.getAttribute("class"));
      dropdownButton.classList.add("pfe-navigation__menu-link--has-dropdown");
      // set aria-expanded to false initially bc they will be closed on page load
      dropdownButton.setAttribute("aria-expanded", "false");

      dropdownButton.innerHTML = dropdownLink.innerHTML;
      dropdownButton.dataset.machineName = this._createMachineName(dropdownLink.text);

      // Add dropdown behavior
      dropdownButton.addEventListener("click", this._dropdownItemToggle);
      dropdownLink.parentElement.replaceChild(dropdownButton, dropdownLink);

      // Set Id's for the button and dropdown and add their ID's to the parent li for easy access
      const dropdownButtonId = `main-menu__button--${dropdownButton.dataset.machineName}`;
      const dropdownId = `main-menu__dropdown--${dropdownButton.dataset.machineName}`;
      dropdownButton.setAttribute("id", dropdownButtonId);
      dropdownButton.parentElement.dataset.buttonId = dropdownButtonId;

      // Create wrapper for dropdown and give it appropriate classes and attributes
      const dropdownWrapper = document.createElement("div");

      dropdownWrapper.classList.add("pfe-navigation__dropdown-wrapper");
      if (dropdown.classList.contains("pfe-navigation__dropdown--single-column")) {
        dropdownWrapper.classList.add("pfe-navigation__dropdown-wrapper--single-column");
      }
      dropdownWrapper.setAttribute("id", dropdownId);
      // set aria-hidden to true initially bc the content is hidden on page load
      dropdownWrapper.setAttribute("aria-hidden", "true");

      dropdownWrapper.classList.add("pfe-navigation__dropdown-wrapper--invisible");
      dropdownWrapper.append(dropdown);
      dropdownButton.parentElement.append(dropdownWrapper);
      dropdownButton.parentElement.dataset.dropdownId = dropdownId;
      dropdownButton.setAttribute("aria-controls", dropdownId);
    }

    // Replace the menu in the shadow DOM
    shadowMenuWrapper.parentElement.replaceChild(newShadowMenuWrapper, shadowMenuWrapper);

    // Re-set pointers to commonly used elements that just got paved over
    this._menuDropdownXs = this.shadowRoot.getElementById("mobile__dropdown");
    this._menuDropdownMd = this.shadowRoot.getElementById("pfe-navigation__menu-wrapper");

    // Add menu burger behavior
    this._mobileToggle.addEventListener("click", this._toggleMobileMenu);

    // Add search toggle behavior
    this._searchToggle.addEventListener("click", this._toggleSearch);

    // Add All Red Hat toggle behavior
    this._allRedHatToggle.addEventListener("click", this._toggleAllRedHat);

    // Add User Menu toggle behavior
    this._userMenuToggle.addEventListener("click", this._toggleUserMenu);

    // General keyboard listener attached to the entire component
    // @todo/bug: figure out why this event listener only fires once you have tabbed into the menu but not if you have just clicked open menu items with a mouse click on Firefox - functions properly on Chrome
    this.addEventListener("keydown", this._generalKeyboardListener);

    // Give all dropdowns aria-hidden since they're shut by default
    this.shadowRoot.querySelector(".pfe-navigation__dropdown-wrapper").setAttribute("aria-hidden", "true");

    // Set initial on page load aria settings on all original buttons and their dropdowns
    this._addCloseDropdownAttributes(this._mobileToggle, this._currentMobileDropdown);
    this._addCloseDropdownAttributes(this._searchToggle, this._searchSpotMd);
    this._addCloseDropdownAttributes(this._allRedHatToggle, this._siteSwitcherWrapperOuter);
    this._addCloseDropdownAttributes(this._userMenuToggle, this._userMenuWrapperOuter);

    this._setCurrentMobileDropdown();

    // Make sure search slot is in the right spot, based on breakpoint
    this._moveSearchSlot();
    // Reconnecting mutationObserver for IE11 & Edge
    if (window.ShadyCSS) {
      this._observer.observe(this, lightDomObserverConfig);
    }

    // Timeout lets these run a little later
    window.setTimeout(this._addMenuBreakpoints, 0);
    window.setTimeout(this._getDropdownHeights, 0);

    // Some cleanup and state management for after render
    const postProcessLightDom = () => {
      if (this.isMobileMenuButtonVisible() && !this.isOpen("mobile__button")) {
        this._addCloseDropdownAttributes(this._mobileToggle, this._currentMobileDropdown);
      }
    };

    window.setTimeout(postProcessLightDom, 10);
  }

  /**
   * Caches the heights of a single dropdown
   */
  _getDropdownHeight(dropdown) {
    const dropdownHeight = dropdown.offsetHeight;
    dropdown.parentElement.dataset.height = dropdownHeight;
    // Update the height inline style of any open dropdown
    if (dropdown.parentElement.hasAttribute("style") && dropdown.parentElement.style.height) {
      dropdown.parentElement.style.height = `${dropdownHeight}px`;
    }
  }

  /**
   * Gets the heights of all dropdowns and cache them as an attribute for use later
   */
  _getDropdownHeights() {
    if (this._isDevelopment()) {
      console.log(`${this.tag}: _getDropdownHeights recalculated`);
    }
    const mainMenuDropdowns = this.shadowRoot.querySelectorAll(".pfe-navigation__dropdown");
    for (let index = 0; index < mainMenuDropdowns.length; index++) {
      const dropdown = mainMenuDropdowns[index];
      const dropdownHeight = dropdown.offsetHeight;
      dropdown.parentElement.dataset.height = dropdownHeight;
      // Update the height inline style of any open dropdown
      if (dropdown.parentElement.hasAttribute("style") && dropdown.parentElement.style.height) {
        dropdown.parentElement.style.height = `${dropdownHeight}px`;
      }
    }

    const otherDropdowns = [];

    // @todo Get Mobile menu height reliably so we can animate it
    // Get height of mobile menu if we're using a mobile menu
    // if (this.isMobileMenuButtonVisible()) {
    //   otherDropdowns.push(this.shadowRoot.querySelector(".pfe-navigation__outer-menu-wrapper__inner"));
    // }

    // Get height of secondary links if they're not in the mobile menu
    if (!this.isSecondaryLinksSectionCollapsed()) {
      otherDropdowns.push(this.querySelector('[slot="pfe-navigation--search"]'));
      otherDropdowns.push(this.shadowRoot.querySelector(".pfe-navigation__all-red-hat-wrapper__inner"));
    }

    for (let index = 0; index < otherDropdowns.length; index++) {
      this._getDropdownHeight(otherDropdowns[index]);
    }
  }

  /**
   * Behavior for main menu breakpoint
   * @param {object} event Event from MediaQueryList
   */
  _collapseMainMenu(event) {
    if (event.matches) {
      this.classList.add("pfe-navigation--collapse-main-menu");
    } else {
      this.classList.remove("pfe-navigation--collapse-main-menu");
    }
  }

  /**
   * Behavior for secondary links breakpoint
   * @param {object} event Event from MediaQueryList
   */
  _collapseSecondaryLinks(event) {
    if (event.matches) {
      this.classList.add("pfe-navigation--collapse-secondary-links");
    } else {
      this.classList.remove("pfe-navigation--collapse-secondary-links");
    }
  }

  /**
   * Calculate the points where the main menu and secondary links should be collapsed and adds them
   */
  _addMenuBreakpoints() {
    let mainMenuRightBoundary = null;
    let secondaryLinksLeftBoundary = null;

    // Calculate space needed for logo
    if (this.logoSpaceNeeded === null) {
      const logoWrapper = this.shadowRoot.getElementById("pfe-navigation__logo-wrapper");
      const logoBoundingRect = logoWrapper.getBoundingClientRect();
      this.logoSpaceNeeded = Math.ceil(logoBoundingRect.right);
    }

    // Calculate space needed for logo and main menu
    if (this.menuBreakpoints.mainMenu === null && !this.isMobileMenuButtonVisible()) {
      const navigation = this.shadowRoot.getElementById("pfe-navigation__menu");
      const navigationBoundingRect = navigation.getBoundingClientRect();

      // Gets the length from the left edge of the screen to the right side of the navigation
      mainMenuRightBoundary = Math.ceil(navigationBoundingRect.right);
    }

    // Calculate space needed for right padding and secondary links
    if (this.menuBreakpoints.secondaryLinks === null && !this.isSecondaryLinksSectionCollapsed()) {
      let leftMostSecondaryLink = this._searchToggle;

      // @todo if Search isn't present, check for custom links, if that isn't present use All Red Hat

      const leftMostSecondaryLinkBoundingRect = leftMostSecondaryLink.getBoundingClientRect();
      // Gets the length from the right edge of the screen to the left side of the left most secondary link
      secondaryLinksLeftBoundary = window.innerWidth - Math.ceil(leftMostSecondaryLinkBoundingRect.left);
    }

    // Get Main Menu Breakpoint
    if (mainMenuRightBoundary && secondaryLinksLeftBoundary && this.logoSpaceNeeded) {
      this.menuBreakpoints.mainMenu = mainMenuRightBoundary + secondaryLinksLeftBoundary;

      const mainMenuBreakpoint = window.matchMedia(`(max-width: ${this.menuBreakpoints.mainMenu}px)`);
      mainMenuBreakpoint.addListener(this._collapseMainMenu);
    }

    if (this.logoSpaceNeeded && secondaryLinksLeftBoundary) {
      // 60px is the width of the menu burger + some extra space
      this.menuBreakpoints.secondaryLinks = this.logoSpaceNeeded + secondaryLinksLeftBoundary + 60;

      const secondaryLinksBreakpoint = window.matchMedia(`(max-width: ${this.menuBreakpoints.secondaryLinks}px)`);
      secondaryLinksBreakpoint.addListener(this._collapseSecondaryLinks);
    }
  }

  /**
   * Depending on breakpoint we need to move the search slot to one of two places to make a logical tab order
   */
  _moveSearchSlot() {
    if (this.isSecondaryLinksSectionCollapsed()) {
      this._removeDropdownAttributes(null, this._searchSpotMd);
      if (this._searchSlot.parentElement !== this._searchSpotXs) {
        this._searchSpotXs.appendChild(this._searchSlot);
      }
    } else {
      if (this._searchSlot.parentElement !== this._searchSpotMd) {
        this._searchSpotMd.appendChild(this._searchSlot);
      }
      if (this.isOpen("secondary-links__button--search")) {
        this._addOpenDropdownAttributes(null, this._searchSpotMd);
      } else {
        this._addCloseDropdownAttributes(null, this._searchSpotMd);
      }
    }
  }

  /**
   * Adjustments to behaviors and DOM that need to be made after a resize event
   */
  _postResizeAdjustments() {
    this._getDropdownHeights();
    const oldMobileDropdown = this._currentMobileDropdown;
    this._setCurrentMobileDropdown();
    const isMobileMenuButtonVisible = this.isMobileMenuButtonVisible();
    const isSecondaryLinksSectionCollapsed = this.isSecondaryLinksSectionCollapsed();

    // If we went from mobile/tablet to desktop
    if (this._wasMobileMenuButtonVisible && !isMobileMenuButtonVisible) {
      this._removeDropdownAttributes(this._mobileToggle, this._currentMobileDropdown);

      // Need to hide the overlay because it's not a dropdown at desktop
      if (this.isOpen("mobile__button")) {
        this._overlay.hidden = true;
      }

      // If we haven't been able to yet, calculate the breakpoints
      if (this.menuBreakpoints.mainMenu === null) {
        this._addMenuBreakpoints();
      }
    }
    // If we went from desktop to tablet/mobile
    else if (!this._wasMobileMenuButtonVisible && isMobileMenuButtonVisible) {
      if (this.isOpen("mobile__button")) {
        this._addOpenDropdownAttributes(this._mobileToggle, this._currentMobileDropdown);
        // Need to show the overlay if the mobile dropdown is open now that it's a dropdown again
        this._overlay.hidden = false;
      } else {
        this._addCloseDropdownAttributes(this._mobileToggle, this._currentMobileDropdown);
      }
      // Add JS height to "All Red Hat Dropdown" if it's open
      const allRedHatDropdown = this.shadowRoot.getElementById(
        this._getDropdownId("secondary-links__button--all-red-hat")
      );
      if (allRedHatDropdown && this.isOpen("secondary-links__button--all-red-hat")) {
        this._addOpenDropdownAttributes(this._allRedHatToggle, allRedHatDropdown);
      }
      // Add JS height to "User Menu Dropdown" if it is open
      const userMenuDropdown = this.shadowRoot.getElementById(
        this._getDropdownId("secondary-links__button--user-menu")
      );
      if (userMenuDropdown && this.isOpen("secondary-links__button--user-menu")) {
        this._addOpenDropdownAttributes(this._userMenuToggle, userMenuDropdown);
      }
    }
    // If we went from desktop/tablet to mobile
    else if (!this._wasSecondaryLinksSectionCollapsed && isSecondaryLinksSectionCollapsed) {
      // Remove height from All Red Hat at mobile since it's a slide over and not a dropdown
      const allRedHatDropdown = this.shadowRoot.getElementById(
        this._getDropdownId("secondary-links__button--all-red-hat")
      );
      if (allRedHatDropdown) {
        allRedHatDropdown.style.removeProperty("height");
      }
    }

    // If the mobile dropdown has changed, remove the dropdown attributes from the old one
    if (this._currentMobileDropdown !== oldMobileDropdown && oldMobileDropdown !== null) {
      this._removeDropdownAttributes(null, oldMobileDropdown);
    }

    // Make sure search slot is in the right spot, based on breakpoint
    this._moveSearchSlot();

    // ! These lines need to be at the end of this function
    this.classList.remove("pfe-navigation--is-resizing");
    // Set layout state vars for next resize
    this._wasMobileMenuButtonVisible = isMobileMenuButtonVisible;
    this._wasSecondaryLinksSectionCollapsed = isSecondaryLinksSectionCollapsed;
  }

  /**
   * Event listeners for toggles
   */
  _toggleMobileMenu(event) {
    if (!this.isOpen("mobile__button")) {
      this._changeNavigationState("mobile__button", "open");
    } else {
      this._changeNavigationState("mobile__button", "close");
    }
  }

  _toggleSearch(event) {
    this._changeNavigationState("secondary-links__button--search");
  }

  _toggleAllRedHat(event) {
    this._changeNavigationState("secondary-links__button--all-red-hat");
    if (this.isOpen("mobile__button")) {
      // if this is the mobile menu and the All Red Hat Toggle is clicked set focus to Back to Menu Button inside of All Red Hat Menu
      this._allRedHatToggleBack.focus();
    }
  }

  _toggleUserMenu(event) {
    this._changeNavigationState("secondary-links__button--user-menu");
    if (this.isOpen("mobile__button")) {
      this._userMenuToggleBack.focus();
    }
  }

  _dropdownItemToggle(event) {
    event.preventDefault();
    const dropdownItem = event.target;
    const toggleId = dropdownItem.getAttribute("id");
    this._changeNavigationState(toggleId);
  }

  /**
   * Default Keydown Keyboard event handler
   * @param {object} event
   */
  _generalKeyboardListener(event) {
    // @note: changed to event.key bc event.which is deprecated
    // see @resource: https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/which
    const key = event.key;

    if (key === "Escape") {
      const currentlyOpenToggleId = this.getAttribute(`${this.tag}-open-toggle`);
      const openToggle = this.shadowRoot.getElementById(currentlyOpenToggleId);
      const openToggleId = this.getAttribute(`${this.tag}-open-toggle`);
      const mobileMenuToggle = this.shadowRoot.querySelector("#mobile__button");

      event.preventDefault();
      event.stopPropagation();

      if (this.isSecondaryLinksSectionCollapsed()) {
        // Mobile
        // close mobile menu
        this._changeNavigationState("mobile__button", "close");
        // Set the focus back onto the mobile menu trigger toggle only when escape is pressed
        mobileMenuToggle.focus();
      } else if (this.isMobileMenuButtonVisible()) {
        // Tablet-ish
        // if it's a child of main menu (e.g. openToggleId.startsWith("main-menu") -- accordion dropdown) close mobile__button
        // Else close openToggleId -- desktop menu
        if (openToggleId.startsWith("main-menu")) {
          this._changeNavigationState("mobile__button", "close");
          // Set the focus back onto the mobile menu trigger toggle only when escape is pressed
          mobileMenuToggle.focus();
        } else {
          this._changeNavigationState(openToggleId, "close");
          // Set the focus back onto the trigger toggle only when escape is pressed
          openToggle.focus();
        }
      } else {
        // Desktop
        // close desktop menu
        this._changeNavigationState(openToggleId, "close");
        // Set the focus back onto the trigger toggle only when escape is pressed
        openToggle.focus();
      }
    }
  }

  /**
   * Back to Menu Event Handler
   * close All Red Hat Menu and Goes back to Main Mobile Menu and sets focus back to All Red Hat Toggle
   */
  _allRedHatToggleBackClickHandler() {
    this._changeNavigationState("mobile__button", "open");
    this._allRedHatToggle.focus();
  }

  _userMenuToggleBackClickHandler() {
    this._changeNavigationState("mobile__button", "open");
    this._userMenuToggle.focus();
  }

  /**
   * Overlay Event Handler
   * close menu when overlay is clicked
   */
  _overlayClickHandler() {
    const openToggleId = this.getAttribute(`${this.tag}-open-toggle`);
    this._changeNavigationState(openToggleId, "close");
    if (this.isSecondaryLinksSectionCollapsed()) {
      // Mobile
      // close mobile menu
      this._changeNavigationState("mobile__button", "close");
    } else if (this.isMobileMenuButtonVisible()) {
      // Tablet-ish
      // if it's a child of main menu (e.g. openToggleId.startsWith("main-menu") -- accordion dropdown) close mobile__button
      // Else close openToggleId -- desktop menu
      if (openToggleId.startsWith("main-menu")) {
        this._changeNavigationState("mobile__button", "close");
      } else {
        this._changeNavigationState(openToggleId, "close");
      }
    } else {
      // Desktop
      // close desktop menu
      this._changeNavigationState(openToggleId, "close");
    }
  }

  /**
   * Sticky Handler
   * turn nav into sticky nav
   */
  _stickyHandler() {
    if (window.pageYOffset >= this.top) {
      this.classList.add("pfe-sticky");
    } else {
      this.classList.remove("pfe-sticky");
    }
  }

  /**
   * All Red Hat Site Switcher XMLHttpRequest API Request
   * requests API content when All Red Hat button is clicked
   */
  _requestSiteSwitcher() {
    const promise = new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      // Hopping out to elements folder in case we're testing a component that isn't pfe-navigation
      xhr.open("GET", "../../pfe-navigation/mock/site-switcher.html");
      xhr.responseType = "text";

      xhr.onload = () => {
        if (xhr.status >= 400) {
          reject(xhr.responseText);
        } else {
          resolve(xhr.responseText);
          this._siteSwitcherWrapper.innerHTML = xhr.responseText;
          // Set the dropdown height for All Red Hat now that we have content
          this._getDropdownHeight(this._siteSwitcherWrapper);
        }
      };

      xhr.onerror = err => {
        this._siteSwitchLoadingIndicator.setAttribute("hidden", true);
        reject(err, "Something went wrong.");
      };

      xhr.send();
    });
  }
}

PFElement.create(PfeNavigation);

export default PfeNavigation;
