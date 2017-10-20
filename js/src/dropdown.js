import Data from './dom/data'
import EventHandler from './dom/eventHandler'
import Manipulator from './dom/manipulator'
import Popper from 'popper.js'
import SelectorEngine from './dom/selectorEngine'
import Util from './util'


/**
 * --------------------------------------------------------------------------
 * Bootstrap (v4.0.0-beta.2): dropdown.js
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * --------------------------------------------------------------------------
 */

const Dropdown = (() => {

  /**
   * Check for Popper dependency
   * Popper - https://popper.js.org
   */
  if (typeof Popper === 'undefined') {
    throw new Error('Bootstrap dropdown require Popper.js (https://popper.js.org)')
  }

  /**
   * ------------------------------------------------------------------------
   * Constants
   * ------------------------------------------------------------------------
   */

  const NAME                     = 'dropdown'
  const VERSION                  = '4.0.0-beta.2'
  const DATA_KEY                 = 'bs.dropdown'
  const EVENT_KEY                = `.${DATA_KEY}`
  const DATA_API_KEY             = '.data-api'
  const ESCAPE_KEYCODE           = 27 // KeyboardEvent.which value for Escape (Esc) key
  const SPACE_KEYCODE            = 32 // KeyboardEvent.which value for space key
  const TAB_KEYCODE              = 9 // KeyboardEvent.which value for tab key
  const ARROW_UP_KEYCODE         = 38 // KeyboardEvent.which value for up arrow key
  const ARROW_DOWN_KEYCODE       = 40 // KeyboardEvent.which value for down arrow key
  const RIGHT_MOUSE_BUTTON_WHICH = 3 // MouseEvent.which value for the right button (assuming a right-handed mouse)
  const REGEXP_KEYDOWN           = new RegExp(`${ARROW_UP_KEYCODE}|${ARROW_DOWN_KEYCODE}|${ESCAPE_KEYCODE}`)

  const Event = {
    HIDE             : `hide${EVENT_KEY}`,
    HIDDEN           : `hidden${EVENT_KEY}`,
    SHOW             : `show${EVENT_KEY}`,
    SHOWN            : `shown${EVENT_KEY}`,
    CLICK            : `click${EVENT_KEY}`,
    CLICK_DATA_API   : `click${EVENT_KEY}${DATA_API_KEY}`,
    KEYDOWN_DATA_API : `keydown${EVENT_KEY}${DATA_API_KEY}`,
    KEYUP_DATA_API   : `keyup${EVENT_KEY}${DATA_API_KEY}`
  }

  const ClassName = {
    DISABLED  : 'disabled',
    SHOW      : 'show',
    DROPUP    : 'dropup',
    MENURIGHT : 'dropdown-menu-right',
    MENULEFT  : 'dropdown-menu-left'
  }

  const Selector = {
    DATA_TOGGLE   : '[data-toggle="dropdown"]',
    FORM_CHILD    : '.dropdown form',
    MENU          : '.dropdown-menu',
    NAVBAR_NAV    : '.navbar-nav',
    VISIBLE_ITEMS : '.dropdown-menu .dropdown-item:not(.disabled)'
  }

  const AttachmentMap = {
    TOP       : 'top-start',
    TOPEND    : 'top-end',
    BOTTOM    : 'bottom-start',
    BOTTOMEND : 'bottom-end'
  }

  const Default = {
    offset      : 0,
    flip        : true
  }

  const DefaultType = {
    offset      : '(number|string|function)',
    flip        : 'boolean'
  }


  /**
   * ------------------------------------------------------------------------
   * Class Definition
   * ------------------------------------------------------------------------
   */

  class Dropdown {

    constructor(element, config) {
      this._element  = element
      this._popper   = null
      this._config   = this._getConfig(config)
      this._menu     = this._getMenuElement()
      this._inNavbar = this._detectNavbar()

      this._addEventListeners()
    }


    // getters

    static get VERSION() {
      return VERSION
    }

    static get Default() {
      return Default
    }

    static get DefaultType() {
      return DefaultType
    }

    // public

    toggle() {
      if (this._element.disabled || this._element.classList.contains(ClassName.DISABLED)) {
        return
      }

      const parent   = Dropdown._getParentFromElement(this._element)
      const isActive = this._menu.classList.contains(ClassName.SHOW)

      Dropdown._clearMenus()

      if (isActive) {
        return
      }

      const relatedTarget = {
        relatedTarget : this._element
      }
      const showEvent = EventHandler.trigger(parent, Event.SHOW, relatedTarget)

      if (showEvent.defaultPrevented) {
        return
      }

      let element = this._element
      // for dropup with alignment we use the parent as popper container
      if (parent.classList.contains(ClassName.DROPUP)) {
        if (this._menu.classList.contains(ClassName.MENULEFT) || this._menu.classList.contains(ClassName.MENURIGHT)) {
          element = parent
        }
      }
      this._popper = new Popper(element, this._menu, this._getPopperConfig())

      // if this is a touch-enabled device we add extra
      // empty mouseover listeners to the body's immediate children;
      // only needed because of broken event delegation on iOS
      // https://www.quirksmode.org/blog/archives/2014/02/mouse_event_bub.html
      if ('ontouchstart' in document.documentElement &&
         !Util.makeArray(SelectorEngine.closest(parent, Selector.NAVBAR_NAV)).length) {
        Util.makeArray(document.body.children).forEach((elem) => {
          EventHandler.on(elem, 'mouseover', null, Util.noop)
        })
      }

      this._element.focus()
      this._element.setAttribute('aria-expanded', true)

      Manipulator.toggleClass(this._menu, ClassName.SHOW)
      Manipulator.toggleClass(parent, ClassName.SHOW)
      EventHandler.trigger(parent, Event.SHOWN, relatedTarget)
    }

    dispose() {
      Data.removeData(this._element, DATA_KEY)
      EventHandler.off(this._element, EVENT_KEY)
      this._element = null
      this._menu = null
      if (this._popper !== null) {
        this._popper.destroy()
      }
      this._popper = null
    }

    update() {
      this._inNavbar = this._detectNavbar()
      if (this._popper !== null) {
        this._popper.scheduleUpdate()
      }
    }

    // private

    _addEventListeners() {
      EventHandler.on(this._element, Event.CLICK, (event) => {
        event.preventDefault()
        event.stopPropagation()
        this.toggle()
      })
    }

    _getConfig(config) {
      config = Util.extend(
        {},
        this.constructor.Default,
        Util.getDataAttributes(this._element),
        config
      )

      Util.typeCheckConfig(
        NAME,
        config,
        this.constructor.DefaultType
      )

      return config
    }

    _getMenuElement() {
      if (!this._menu) {
        const parent = Dropdown._getParentFromElement(this._element)
        this._menu = SelectorEngine.findOne(Selector.MENU, parent)
      }
      return this._menu
    }

    _getPlacement() {
      const parentDropdown = this._element.parentNode
      let placement = AttachmentMap.BOTTOM

      // Handle dropup
      if (parentDropdown.classList.contains(ClassName.DROPUP)) {
        placement = AttachmentMap.TOP
        if (this._menu.classList.contains(ClassName.MENURIGHT)) {
          placement = AttachmentMap.TOPEND
        }
      } else if (this._menu.classList.contains(ClassName.MENURIGHT)) {
        placement = AttachmentMap.BOTTOMEND
      }
      return placement
    }

    _detectNavbar() {
      return Util.makeArray(SelectorEngine.closest(this._element, '.navbar')).length > 0
    }

    _getPopperConfig() {
      const offsetConf = {}
      if (typeof this._config.offset === 'function') {
        offsetConf.fn = (data) => {
          data.offsets = $.extend({}, data.offsets, this._config.offset(data.offsets) || {})
          return data
        }
      } else {
        offsetConf.offset = this._config.offset
      }
      const popperConfig = {
        placement : this._getPlacement(),
        modifiers : {
          offset : offsetConf,
          flip : {
            enabled : this._config.flip
          }
        }
      }

      // Disable Popper.js for Dropdown in Navbar
      if (this._inNavbar) {
        popperConfig.modifiers.applyStyle = {
          enabled: !this._inNavbar
        }
      }
      return popperConfig
    }

    // static

    static _dropdownInterface(element, config) {
      let data = Data.getData(element, DATA_KEY)
      const _config = typeof config === 'object' ? config : null

      if (!data) {
        data = new Dropdown(element, _config)
        Data.setData(element, DATA_KEY, data)
      }

      if (typeof config === 'string') {
        if (typeof data[config] === 'undefined') {
          throw new Error(`No method named "${config}"`)
        }
        data[config]()
      }
    }

    static _jQueryInterface(config) {
      return this.each(function () {
        Dropdown._dropdownInterface(this, config)
      })
    }

    static _clearMenus(event) {
      if (event && (event.which === RIGHT_MOUSE_BUTTON_WHICH ||
        event.type === 'keyup' && event.which !== TAB_KEYCODE)) {
        return
      }

      const toggles = Util.makeArray(SelectorEngine.find(Selector.DATA_TOGGLE))
      for (let i = 0; i < toggles.length; i++) {
        const parent        = Dropdown._getParentFromElement(toggles[i])
        const context       = Data.getData(toggles[i], DATA_KEY)
        const relatedTarget = {
          relatedTarget : toggles[i]
        }

        if (!context) {
          continue
        }

        const dropdownMenu = context._menu
        if (!parent.classList.contains(ClassName.SHOW)) {
          continue
        }

        if (event && (event.type === 'click' &&
            /input|textarea/i.test(event.target.tagName) || event.type === 'keyup' && event.which === TAB_KEYCODE)
            && parent.contains(event.target)) {
          continue
        }

        const hideEvent = EventHandler.trigger(parent, Event.HIDE, relatedTarget)
        if (hideEvent.defaultPrevented) {
          continue
        }

        // if this is a touch-enabled device we remove the extra
        // empty mouseover listeners we added for iOS support
        if ('ontouchstart' in document.documentElement) {
          Util.makeArray(document.body.children).forEach((elem) => {
            EventHandler.off(elem, 'mouseover', null, Util.noop)
          })
        }

        toggles[i].setAttribute('aria-expanded', 'false')

        dropdownMenu.classList.remove(ClassName.SHOW)
        parent.classList.remove(ClassName.SHOW)
        EventHandler.trigger(parent, Event.HIDDEN, relatedTarget)
      }
    }

    static _getParentFromElement(element) {
      let parent
      const selector = Util.getSelectorFromElement(element)

      if (selector) {
        parent = SelectorEngine.findOne(selector)
      }

      return parent || element.parentNode
    }

    static _dataApiKeydownHandler(event) {
      if (!REGEXP_KEYDOWN.test(event.which) || /button/i.test(event.target.tagName) && event.which === SPACE_KEYCODE ||
         /input|textarea/i.test(event.target.tagName)) {
        return
      }

      event.preventDefault()
      event.stopPropagation()

      if (this.disabled || this.classList.contains(ClassName.DISABLED)) {
        return
      }

      const parent   = Dropdown._getParentFromElement(this)
      const isActive = parent.classList.contains(ClassName.SHOW)

      if (!isActive && (event.which !== ESCAPE_KEYCODE || event.which !== SPACE_KEYCODE) ||
           isActive && (event.which === ESCAPE_KEYCODE || event.which === SPACE_KEYCODE)) {

        if (event.which === ESCAPE_KEYCODE) {
          const toggle = SelectorEngine.findOne(Selector.DATA_TOGGLE, parent)
          EventHandler.trigger(toggle, 'focus')
        }

        EventHandler.trigger(this, 'click')
        return
      }

      const items = Util.makeArray(SelectorEngine.find(Selector.VISIBLE_ITEMS, parent))

      if (!items.length) {
        return
      }

      let index = items.indexOf(event.target)

      if (event.which === ARROW_UP_KEYCODE && index > 0) { // up
        index--
      }

      if (event.which === ARROW_DOWN_KEYCODE && index < items.length - 1) { // down
        index++
      }

      if (index < 0) {
        index = 0
      }

      items[index].focus()
    }

  }


  /**
   * ------------------------------------------------------------------------
   * Data Api implementation
   * ------------------------------------------------------------------------
   */

  EventHandler.on(document, Event.KEYDOWN_DATA_API, Selector.DATA_TOGGLE, Dropdown._dataApiKeydownHandler)
  EventHandler.on(document, Event.KEYDOWN_DATA_API, Selector.MENU, Dropdown._dataApiKeydownHandler)
  EventHandler.on(document, Event.CLICK_DATA_API, Dropdown._clearMenus)
  EventHandler.on(document, Event.KEYUP_DATA_API, Dropdown._clearMenus)
  EventHandler.on(document, Event.CLICK_DATA_API, Selector.DATA_TOGGLE, function (event) {
    event.preventDefault()
    event.stopPropagation()
    Dropdown._dropdownInterface(this, 'toggle')
  })
  EventHandler.on(document, Event.CLICK_DATA_API, Selector.FORM_CHILD, (e) => {
    e.stopPropagation()
  })


  /**
   * ------------------------------------------------------------------------
   * jQuery
   * ------------------------------------------------------------------------
   * add .dropdown to jQuery only if jQuery is present
   */
  const $ = Util.jQuery
  if (typeof $ !== 'undefined') {
    const JQUERY_NO_CONFLICT = $.fn[NAME]
    $.fn[NAME]               = Dropdown._jQueryInterface
    $.fn[NAME].Constructor   = Dropdown
    $.fn[NAME].noConflict    = function () {
      $.fn[NAME] = JQUERY_NO_CONFLICT
      return Dropdown._jQueryInterface
    }
  }

  return Dropdown

})(Popper)

export default Dropdown
