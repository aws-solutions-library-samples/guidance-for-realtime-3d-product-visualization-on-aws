// Utility to convert touch events to single-button mouse events

/**
 * Add event listeners which convert touch events to mouse events
 * @param {HTMLElement} element 
 */
function RegisterTouchToMouse(element) {

    // Closure variables captured by start/move/stop handlers
    let activeTouchIdentifier = null;
    let activeTouchClientX = 0;
    let activeTouchClientY = 0;
    let activeTouchScreenX = 0;
    let activeTouchScreenY = 0;

    /**
     * @param {string} type 
     * @param {TouchEvent} event 
     * @param {MouseEventInit} additionalInitOpts
     * @returns {MouseEvent}
     */
    function syntheticEvent(type, event, additionalInitOpts) {
        const initOpts = {
            bubbles: false,
            view: event.view,
            altKey: event.altKey,
            ctrlKey: event.ctrlKey,
            shiftKey: event.shiftKey,
            metaKey: event.metaKey,
        };
        // getModifierState on TouchEvent is in W3C spec, but currently no browser implements it.
        if (event.getModifierState) {
            initOpts.modifierAltGraph = event.getModifierState("AltGraph");
            initOpts.modifierCapsLock = event.getModifierState("CapsLock");
            initOpts.modifierFn = event.getModifierState("Fn");
            initOpts.modifierFnLock = event.getModifierState("FnLock");
            initOpts.modifierHyper = event.getModifierState("Hyper");
            initOpts.modifierNumLock = event.getModifierState("NumLock");
            initOpts.modifierScrollLock = event.getModifierState("ScrollLock");
            initOpts.modifierSuper = event.getModifierState("Super");
            initOpts.modifierSymbol = event.getModifierState("Symbol");
            initOpts.modifierSymbolLock = event.getModifierState("SymbolLock");
        }
        for (const key in additionalInitOpts) {
            initOpts[key] = additionalInitOpts[key];
        }
        return new MouseEvent(type, initOpts);
    }
    
    /**
     * @param {TouchEvent} event
     */
    function start(event) {
        event.preventDefault();
        if (activeTouchIdentifier !== null || event.targetTouches.length == 0) {
            return;
        }
        const touch = event.targetTouches[0];
        activeTouchIdentifier = touch.identifier;
        activeTouchClientX = touch.clientX;
        activeTouchClientY = touch.clientY;
        activeTouchScreenX = touch.screenX;
        activeTouchScreenY = touch.screenY;
        element.dispatchEvent(syntheticEvent('mousemove', event, {
            clientX: touch.clientX,
            clientY: touch.clientY,
            screenX: touch.screenX,
            screenY: touch.screenY,
            buttons: 0,
        }));
        element.dispatchEvent(syntheticEvent('mousedown', event, {
            clientX: touch.clientX,
            clientY: touch.clientY,
            screenX: touch.screenX,
            screenY: touch.screenY,
            button: 0,
            buttons: 1,
        }));
    }

    /**
     * @param {TouchEvent} event
     */
    function move(event) {
        event.preventDefault();
        if (activeTouchIdentifier === null || event.targetTouches.length == 0) {
            return;
        }
        let touch = event.targetTouches[0];
        for (const iter of event.targetTouches) {
            if (iter.identifier === activeTouchIdentifier) {
                touch = iter;
                break;
            }
        }
        const movementX = touch.clientX - activeTouchClientX;
        const movementY = touch.clientY - activeTouchClientY;
        activeTouchIdentifier = touch.identifier;
        activeTouchClientX = touch.clientX;
        activeTouchClientY = touch.clientY;
        activeTouchScreenX = touch.screenX;
        activeTouchScreenY = touch.screenY;
        element.dispatchEvent(syntheticEvent('mousemove', event, {
            clientX: touch.clientX,
            clientY: touch.clientY,
            screenX: touch.screenX,
            screenY: touch.screenY,
            movementX: movementX,
            movementY: movementY,
            buttons: 1,
        }));
    }

    /**
     * @param {TouchEvent} event
     */
    function stop(event) {
        event.preventDefault();
        if (activeTouchIdentifier === null || event.targetTouches.length !== 0) {
            return;
        }
        activeTouchIdentifier = null;
        element.dispatchEvent(syntheticEvent('mouseup', event, {
            clientX: activeTouchClientX,
            clientY: activeTouchClientY,
            screenX: activeTouchScreenX,
            screenY: activeTouchScreenY,
            button: 0,
            buttons: 0,
        }));
    }

    element.addEventListener('touchstart', start);
    element.addEventListener('touchmove', move);
    element.addEventListener('touchend', stop);

    element.touchToMouse_unregister = function() {
        element.removeEventListener('touchstart', start);
        element.removeEventListener('touchmove', move);
        element.removeEventListener('touchend', stop);
    }
}

/**
 * Remove event listeners which convert touch events to mouse events
 * @param {HTMLElement} element 
 */
function UnregisterTouchToMouse(element) {
    if (element.touchToMouse_unregister) {
        element.touchToMouse_unregister();
        delete element.touchToMouse_unregister;
    }
}
