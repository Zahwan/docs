/*
 * @license
 * Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

import { PolymerElement, html } from '@polymer/polymer/polymer-element.js';
import sdk from '@stackblitz/sdk';

// super-simple fetch polyfill for IE.
function fakeFetch(url) {
  let res;
  let rej;
  const promise = new Promise(function(resolve, reject) {
    res = resolve;
    rej = reject;
  });
  const xhr = new XMLHttpRequest();

  xhr.onerror = function(err) {
    rej(err);
  };
  xhr.onreadystatechange = function() {
    if (xhr.readyState === XMLHttpRequest.DONE) {
      res(xhr.responseText);
    }
  };
  xhr.open('GET', url, true);
  xhr.send();

  return promise;
}

class StackBlitz extends PolymerElement {
  static get template() {
    return html`
    <style>
      :host {
        display: block;
        height: 500px;
      }

      #wrapper {
        height: 100%;
        width: 100%;
      }
    </style>
    <div id="wrapper"></div>
    `;
  }

  static get properties() {
    return {
      /**
       * REQUIRED: absolute path to the project directory
       *
       * e.g. /3.0/start/samples/custom-element
       *     or /2.0/start/samples/employee-list
       */
      projectPath: {
        type: String,
      },

      openFile: {
        type: String,
        value: 'index.html',
      },

      /**
       * Can be `'editor'` or `'preview`'
       */
      view: {
        type: String,
        value: 'editor',
      },

      /**
       * Can be 'angular-cli'|'create-react-app'|'typescript'|'javascript'.
       */
      projectTemplate: {
        type: String,
        value: 'javascript',
      },

      title: {
        type: String,
        value: 'Polymer',
      },

      description: {
        type: String,
        value: 'Code example',
      },

      enableFullLayout: {
        type: Boolean,
        value: false,
      },

      clickToLoad: {
        type: Boolean,
        value: false,
      },

      noAutoEmbed: {
        type: Boolean,
        value: false,
      }
    };
  }

  connectedCallback() {
    super.connectedCallback();

    if(!this.noAutoEmbed) {
      this.embed();
    }
  }

  embed() {
    const endsWithSlash =
        this.projectPath[this.projectPath.length - 1] === '/';
    const projectDir = endsWithSlash ?
        this.projectPath : this.projectPath + '/';

    return fakeFetch(`${projectDir}manifest.json`)
        .then((manifestRes) => {
          const json = JSON.parse(manifestRes);
          const filesLoaded = [];
          const files = json.files;

          function generateHandleFileText(fileName) {
            return function(fileText) {
              return {
                name: fileName,
                text: fileText,
              };
            };
          }

          // for-of here causes babel IE Symbol is not defined error
          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const filepath = projectDir + file;
            const handleFileText = generateHandleFileText(file);
            const fileLoaded = fakeFetch(filepath).then(handleFileText);

            filesLoaded.push(fileLoaded);
          }

          return Promise.all(filesLoaded)
            .then((files) => {
              // filename to file text map
              const projectFiles = files.reduce(function(proj, file) {
                proj[file.name] = file.text;
                return proj;
              }, {});

              const project = {
                files: projectFiles,
                title: this.title,
                description: this.description,
                dependencies: json.dependencies,
                template: this.projectTemplate,
                settings: {
                  action: 'refresh',
                },
              };

              const embedOptions = {
                view: this.view,
                openFile: this.openFile,
                forceEmbedLayout: !this.enableFullLayout,
                clickToLoad: this.clickToLoad,
              };

              return sdk.embedProject(this.$.wrapper, project, embedOptions);
            });
          }).catch(function(err) {
            console.error(err.message ? err.message : err);
          });
  }
}

customElements.define('stack-blitz', StackBlitz);
