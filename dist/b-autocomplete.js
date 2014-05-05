(function () {
    var KEY = {
            ENTER: 13,
            LEFT: 37,
            UP: 38,
            RIGHT: 39,
            DOWN: 40
        };
    function normalizeTokens(tokens) {
        return tokens.filter(function (token) {
            return !!token;
        }).map(function (token) {
            return token.toLowerCase();
        });
    }
    function newIndexNode() {
        return {
            ids: [],
            children: {}
        };
    }
    function buildIndex(options) {
        var index = newIndexNode();
        options.forEach(function (option, id) {
            var val = option.text || option.value, tokens = normalizeTokens(val.split(/\s+/));
            tokens.forEach(function (token) {
                var ch, chars = token.split(''), node = index;
                while (ch = chars.shift()) {
                    node = node.children[ch] || (node.children[ch] = newIndexNode());
                    node.ids.push(id);
                }
            });
        });
        return index;
    }
    function find(query, index, options) {
        var matches, tokens = normalizeTokens(query.split(/\s+/));
        tokens.forEach(function (token) {
            var node = index, ch, chars = token.split('');
            if (matches && matches.length === 0) {
                return false;
            }
            while (node && (ch = chars.shift())) {
                node = node.children[ch];
            }
            if (node && chars.length === 0) {
                ids = node.ids.slice(0);
                matches = matches ? getIntersection(matches, ids) : ids;
            } else {
                matches = [];
                return false;
            }
        });
        return matches ? unique(matches).map(function (id) {
            return options[id];
        }) : [];
    }
    function unique(array) {
        var seen = {}, uniques = [];
        for (var i = 0; i < array.length; i++) {
            if (!seen[array[i]]) {
                seen[array[i]] = true;
                uniques.push(array[i]);
            }
        }
        return uniques;
    }
    function getIntersection(arrayA, arrayB) {
        var ai = 0, bi = 0, intersection = [];
        arrayA = arrayA.sort(compare);
        arrayB = arrayB.sort(compare);
        while (ai < arrayA.length && bi < arrayB.length) {
            if (arrayA[ai] < arrayB[bi]) {
                ai++;
            } else if (arrayA[ai] > arrayB[bi]) {
                bi++;
            } else {
                intersection.push(arrayA[ai]);
                ai++;
                bi++;
            }
        }
        return intersection;
        function compare(a, b) {
            return a - b;
        }
    }
    var BAutocompletePrototype = Object.create(HTMLElement.prototype, {
            options: {
                enumerable: true,
                get: function () {
                    var list = document.querySelector('#' + this.getAttribute('list'));
                    if (list && list.options) {
                        CustomElements.upgrade(list);
                        return Array.prototype.slice.call(list.options, 0);
                    }
                    return [];
                }
            },
            index: {
                enumerable: true,
                get: function () {
                    if (!this.__index) {
                        this.__index = buildIndex(this.options);
                    }
                    return this.__index;
                }
            },
            suggestionList: {
                enumerable: true,
                get: function () {
                    return this.querySelector('ul');
                }
            },
            selectable: {
                enumerable: true,
                get: function () {
                    return this.querySelector('b-selectable');
                }
            },
            input: {
                enumerable: true,
                get: function () {
                    return this.querySelector('input[type=text]');
                }
            },
            createdCallback: {
                enumerable: true,
                value: function () {
                    this.appendChild(this.template.content.cloneNode(true));
                    this.input.addEventListener('input', this.onInputChange.bind(this), false);
                    this.input.addEventListener('focus', this.onInputFocus.bind(this), false);
                    this.input.addEventListener('blur', this.onInputBlur.bind(this), false);
                    this.selectable.addEventListener('mousedown', this.onSuggestionPick.bind(this), false);
                    this.selectable.addEventListener('b-activate', this.pickSuggestion.bind(this), false);
                }
            },
            handleAria: {
                enumerable: true,
                value: function () {
                    this.setAttribute('role', 'combobox');
                    this.setAttribute('aria-autocomplete', 'list');
                }
            },
            onInputFocus: {
                enumerable: true,
                value: function (e) {
                    this.keydownListener = this.keydownHandler.bind(this);
                    this.input.addEventListener('keydown', this.keydownListener, false);
                }
            },
            onInputBlur: {
                enumerable: true,
                value: function (e) {
                    if (this.cancelBlur) {
                        this.cancelBlur = false;
                        return;
                    }
                    this.input.removeEventListener('keydown', this.keydownListener, false);
                    this.hideSuggestionList();
                }
            },
            onSuggestionPick: {
                enumerable: true,
                value: function (e) {
                    e.preventDefault();
                    this.cancelBlur = true;
                }
            },
            keydownHandler: {
                enumerable: true,
                value: function (e) {
                    e.stopPropagation();
                    switch (e.keyCode) {
                    case KEY.ENTER: {
                            this.selectable.activate();
                            break;
                        }
                    case KEY.DOWN: {
                            if (!this.areSuggestionsVisible()) {
                                this.showSuggestionList();
                            } else {
                                this.selectable.selectNextItem();
                            }
                            break;
                        }
                    case KEY.UP: {
                            if (!this.areSuggestionsVisible()) {
                                this.showSuggestionList();
                            } else {
                                this.selectable.selectPreviousItem();
                            }
                            break;
                        }
                    default:
                        return;
                    }
                    e.preventDefault();
                }
            },
            onInputChange: {
                enumerable: true,
                value: function (e) {
                    e.stopPropagation();
                    if (!this.areSuggestionsVisible()) {
                        this.showSuggestionList();
                        this.input.focus();
                    } else {
                        this.refreshSuggestionList();
                    }
                    this.selectFirstSuggestion();
                }
            },
            filterOptions: {
                enumerable: true,
                value: function () {
                    var query = this.input.value;
                    if (!query)
                        return this.options;
                    return find(query, this.index, this.options);
                }
            },
            paintSuggestionList: {
                enumerable: true,
                value: function () {
                    this.selectable.unselect();
                    var list = this.suggestionList, options = this.filterOptions();
                    while (list.childNodes.length > 0) {
                        list.removeChild(list.childNodes[0]);
                    }
                    options.forEach(function (option) {
                        var li = document.createElement('li');
                        li.innerHTML = option.text || option.value;
                        list.appendChild(li);
                    });
                }
            },
            refreshSuggestionList: {
                enumerable: true,
                value: function () {
                    this.paintSuggestionList();
                }
            },
            toggleSuggestionList: {
                enumerable: true,
                value: function (e) {
                    if (e) {
                        e.stopPropagation();
                    }
                    this.areSuggestionsVisible() ? this.hideSuggestionList() : this.showSuggestionList();
                    this.input.focus();
                }
            },
            showSuggestionList: {
                enumerable: true,
                value: function () {
                    this.paintSuggestionList();
                    this.selectable.setAttribute('visible', '');
                }
            },
            hideSuggestionList: {
                enumerable: true,
                value: function () {
                    if (this.areSuggestionsVisible()) {
                        this.selectable.removeAttribute('visible');
                    }
                }
            },
            selectFirstSuggestion: {
                enumerable: true,
                value: function () {
                    this.selectable.selectFirst();
                }
            },
            areSuggestionsVisible: {
                enumerable: true,
                value: function () {
                    return this.selectable.hasAttribute('visible');
                }
            },
            pickSuggestion: {
                enumerable: true,
                value: function (e) {
                    this.cancelBlur = false;
                    this.input.value = this.getItemValue(e.detail.item);
                    this.hideSuggestionList();
                }
            },
            getItemValue: {
                enumerable: true,
                value: function (itemIndex) {
                    return this.querySelectorAll('li')[itemIndex].innerHTML;
                }
            }
        });
    window.BAutocomplete = document.registerElement('b-autocomplete', { prototype: BAutocompletePrototype });
    Object.defineProperty(BAutocompletePrototype, 'template', {
        get: function () {
            var fragment = document.createDocumentFragment();
            var div = fragment.appendChild(document.createElement('div'));
            div.innerHTML = ' <input type="text" autocomplete="off" role="textbox" value=""> <b-selectable target="li"> <ul></ul> </b-selectable> ';
            while (child = div.firstChild) {
                fragment.insertBefore(child, div);
            }
            fragment.removeChild(div);
            return { content: fragment };
        }
    });
}());
(function () {
    var BComboBoxPrototype = Object.create(BAutocomplete.prototype, {
            listToggle: {
                enumerable: true,
                get: function () {
                    return this.querySelector('.b-combo-box-toggle');
                }
            },
            createdCallback: {
                enumerable: true,
                value: function () {
                    this._super.createdCallback.call(this);
                    this.listToggle.addEventListener('click', this.toggleSuggestionList.bind(this), false);
                }
            }
        });
    window.BComboBox = document.registerElement('b-combo-box', { prototype: BComboBoxPrototype });
    Object.defineProperty(BComboBox.prototype, '_super', {
        enumerable: false,
        writable: false,
        configurable: false,
        value: BAutocomplete.prototype
    });
    Object.defineProperty(BComboBoxPrototype, 'template', {
        get: function () {
            var fragment = document.createDocumentFragment();
            var div = fragment.appendChild(document.createElement('div'));
            div.innerHTML = ' <input type="text" autocomplete="off" role="textbox" value=""> <a class="b-combo-box-toggle"></a> <b-selectable target="li"> <ul></ul> </b-selectable> ';
            while (child = div.firstChild) {
                fragment.insertBefore(child, div);
            }
            fragment.removeChild(div);
            return { content: fragment };
        }
    });
}());