// Type definitions for [~THE LIBRARY NAME~] [~OPTIONAL VERSION NUMBER~]
// Project: [~THE PROJECT NAME~]
// Definitions by: [~YOUR NAME~] <[~A URL FOR YOU~]>
import { autoReveal } from "./reveal.js";
/*~ This is the module template file for class modules.
 *~ You should rename it to index.d.ts and place it in a folder with the same name as the module.
 *~ For example, if you were writing a file for "super-greeter", this
 *~ file should be 'super-greeter/index.d.ts'
 */

/*~ Note that ES6 modules cannot directly export class objects.
 *~ This file should be imported using the CommonJS-style:
 *~   import x = require('someLibrary');
 *~
 *~ Refer to the documentation to understand common
 *~ workarounds for this limitation of ES6 modules.
 */

/*~ If this module is a UMD module that exposes a global variable 'myClassLib' when
 *~ loaded outside a module loader environment, declare that global here.
 *~ Otherwise, delete this declaration.
 */
export as namespace RHElement;

/*~ This declaration specifies that the class constructor function
 *~ is the exported object from the file
 */
export = RHElement;

/*~ Write your module's methods and properties in this class */
declare class RHElement extends HTMLElement{
    static create(rhe: RHElement): void;
    static debugLog(preference?: any): void;
    static log(...msgs:string[]): void;
    static RhTypes(): Object;
    constructor(rhClass: RHElement, {type, delayRender}?: {type?: string, delayRender?: boolean});
    connectedCallback(): void;
    attributeChangedCallback(attr: string, oldVal:any, newVal:any): void;
    rhType: string;
    _copyAttribute(name:string, to:string): void;
    _queueAction(action: any);
    _processQueue(): void;
    _setProperty(name?: string, value?: any): void;
    render(): void;
    log(...msgs: string[]): void;
}


