/**
 * jquery.mask.js
 * @version: v1.13.4
 * @author: Igor Escobar
 *
 * Created by Igor Escobar on 2012-03-10. Please report any bug at http://blog.igorescobar.com
 *
 * Copyright (c) 2012 Igor Escobar http://blog.igorescobar.com
 *
 * The MIT License (http://www.opensource.org/licenses/mit-license.php)
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without
 * restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following
 * conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 * OTHER DEALINGS IN THE SOFTWARE.
 */

/* jshint laxbreak: true */
/* global define, jQuery, Zepto */

'use strict';

// UMD (Universal Module Definition) patterns for JavaScript modules that work everywhere.
// https://github.com/umdjs/umd/blob/master/jqueryPluginCommonjs.js
(function (factory) {

    if (typeof define === 'function' && define.amd) {
        define(['jquery'], factory);
    } else if (typeof exports === 'object') {
        module.exports = factory(require('jquery'));
    } else {
        factory(jQuery || Zepto);
    }

}(function ($) {

    var Mask = function (el, mask, options) {
        el = $(el);

        var jMask = this, oldValue = el.val(), regexMask;

        mask = typeof mask === 'function' ? mask(el.val(), undefined, el,  options) : mask;

        var p = {
            invalid: [],
            getCaret: function () {
                try {
                    var sel,
                        pos = 0,
                        ctrl = el.get(0),
                        dSel = document.selection,
                        cSelStart = ctrl.selectionStart;

                    // IE Support
                    if (dSel && navigator.appVersion.indexOf('MSIE 10') === -1) {
                        sel = dSel.createRange();
                        sel.moveStart('character', el.is('input') ? -el.val().length : -el.text().length);
                        pos = sel.text.length;
                    }
                    // Firefox support
                    else if (cSelStart || cSelStart === '0') {
                        pos = cSelStart;
                    }

                    return pos;
                } catch (e) {}
            },
            setCaret: function(pos) {
                try {
                    if (el.is(':focus')) {
                        var range, ctrl = el.get(0);

                        if (ctrl.setSelectionRange) {
                            ctrl.setSelectionRange(pos,pos);
                        } else if (ctrl.createTextRange) {
                            range = ctrl.createTextRange();
                            range.collapse(true);
                            range.moveEnd('character', pos);
                            range.moveStart('character', pos);
                            range.select();
                        }
                    }
                } catch (e) {}
            },
            events: function() {
                el
                .on('input.mask keyup.mask', p.behaviour)
                .on('paste.mask drop.mask', function() {
                    setTimeout(function() {
                        el.keydown().keyup();
                    }, 100);
                })
                .on('change.mask', function(){
                    el.data('changed', true);
                })
                .on('blur.mask', function(){
                    if (oldValue !== el.val() && !el.data('changed')) {
                        el.triggerHandler('change');
                    }
                    el.data('changed', false);
                })
                // it's very important that this callback remains in this position
                // otherwhise oldValue it's going to work buggy
                .on('blur.mask', function() {
                    oldValue = el.val();
                })
                // select all text on focus
                .on('focus.mask', function (e) {
                    if (options.selectOnFocus === true) {
                        $(e.target).select();
                    }
                })
                // clear the value if it not complete the mask
                .on('focusout.mask', function() {
                    if (options.clearIfNotMatch && !regexMask.test(p.val())) {
                       p.val('');
                   }
                });
            },
            getRegexMask: function() {
                var maskChunks = [], translation, pattern, optional, recursive, oRecursive, r;

                for (var i = 0; i < mask.length; i++) {
                    translation = jMask.translation[mask.charAt(i)];

                    if (translation) {

                        pattern = translation.pattern.toString().replace(/.{1}$|^.{1}/g, '');
                        optional = translation.optional;
                        recursive = translation.recursive;

                        if (recursive) {
                            maskChunks.push(mask.charAt(i));
                            oRecursive = {digit: mask.charAt(i), pattern: pattern};
                        } else {
                            maskChunks.push(!optional && !recursive ? pattern : (pattern + '?'));
                        }

                    } else {
                        maskChunks.push(mask.charAt(i).replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));
                    }
                }

                r = maskChunks.join('');

                if (oRecursive) {
                    r = r.replace(new RegExp('(' + oRecursive.digit + '(.*' + oRecursive.digit + ')?)'), '($1)?')
                         .replace(new RegExp(oRecursive.digit, 'g'), oRecursive.pattern);
                }

                return new RegExp(r);
            },
            destroyEvents: function() {
                el.off(['input', 'keydown', 'keyup', 'paste', 'drop', 'blur', 'focusout', ''].join('.mask '));
            },
            val: function(v) {
                var isInput = el.is('input'),
                    method = isInput ? 'val' : 'text',
                    r;

                if (arguments.length > 0) {
                    if (el[method]() !== v) {
                        el[method](v);
                    }
                    r = el;
                } else {
                    r = el[method]();
                }

                return r;
            },
            getMCharsBeforeCount: function(index, onCleanVal) {
                for (var count = 0, i = 0, maskL = mask.length; i < maskL && i < index; i++) {
                    if (!jMask.translation[mask.charAt(i)]) {
                        index = onCleanVal ? index + 1 : index;
                        count++;
                    }
                }
                return count;
            },
            caretPos: function (originalCaretPos, oldLength, newLength, maskDif) {
                var translation = jMask.translation[mask.charAt(Math.min(originalCaretPos - 1, mask.length - 1))];

                return !translation ? p.caretPos(originalCaretPos + 1, oldLength, newLength, maskDif)
                                    : Math.min(originalCaretPos + newLength - oldLength - maskDif, newLength);
            },
            behaviour: function(e) {
                e = e || window.event;
                p.invalid = [];
                var keyCode = e.keyCode || e.which;
                if ($.inArray(keyCode, jMask.byPassKeys) === -1) {

                    var caretPos = p.getCaret(),
                        currVal = p.val(),
                        currValL = currVal.length,
                        changeCaret = caretPos < currValL,
                        newVal = p.getMasked(),
                        newValL = newVal.length,
                        maskDif = p.getMCharsBeforeCount(newValL - 1) - p.getMCharsBeforeCount(currValL - 1);

                    p.val(newVal);

                    // change caret but avoid CTRL+A
                    if (changeCaret && !(keyCode === 65 && e.ctrlKey)) {
                        // Avoid adjusting caret on backspace or delete
                        if (!(keyCode === 8 || keyCode === 46)) {
                            caretPos = p.caretPos(caretPos, currValL, newValL, maskDif);
                        }
                        p.setCaret(caretPos);
                    }

                    return p.callbacks(e);
                }
            },
            getMasked: function(skipMaskChars) {
                var buf = [],
                    value = p.val(),
                    m = 0, maskLen = mask.length,
                    v = 0, valLen = value.length,
                    offset = 1, addMethod = 'push',
                    resetPos = -1,
                    lastMaskChar,
                    check;

                if (options.reverse) {
                    addMethod = 'unshift';
                    offset = -1;
                    lastMaskChar = 0;
                    m = maskLen - 1;
                    v = valLen - 1;
                    check = function () {
                        return m > -1 && v > -1;
                    };
                } else {
                    lastMaskChar = maskLen - 1;
                    check = function () {
                        return m < maskLen && v < valLen;
                    };
                }

                while (check()) {
                    var maskDigit = mask.charAt(m),
                        valDigit = value.charAt(v),
                        translation = jMask.translation[maskDigit];

                    if (translation) {
                        if (valDigit.match(translation.pattern)) {
                            buf[addMethod](valDigit);
                             if (translation.recursive) {
                                if (resetPos === -1) {
                                    resetPos = m;
                                } else if (m === lastMaskChar) {
                                    m = resetPos - offset;
                                }

                                if (lastMaskChar === resetPos) {
                                    m -= offset;
                                }
                            }
                            m += offset;
                        } else if (translation.optional) {
                            m += offset;
                            v -= offset;
                        } else if (translation.fallback) {
                            buf[addMethod](translation.fallback);
                            m += offset;
                            v -= offset;
                        } else {
                          p.invalid.push({p: v, v: valDigit, e: translation.pattern});
                        }
                        v += offset;
                    } else {
                        if (!skipMaskChars) {
                            buf[addMethod](maskDigit);
                        }

                        if (valDigit === maskDigit) {
                            v += offset;
                        }

                        m += offset;
                    }
                }

                var lastMaskCharDigit = mask.charAt(lastMaskChar);
                if (maskLen === valLen + 1 && !jMask.translation[lastMaskCharDigit]) {
                    buf.push(lastMaskCharDigit);
                }

                return buf.join('');
            },
            callbacks: function (e) {
                var val = p.val(),
                    changed = val !== oldValue,
                    defaultArgs = [val, e, el, options],
                    callback = function(name, criteria, args) {
                        if (typeof options[name] === 'function' && criteria) {
                            options[name].apply(this, args);
                        }
                    };

                callback('onChange', changed === true, defaultArgs);
                callback('onKeyPress', changed === true, defaultArgs);
                callback('onComplete', val.length === mask.length, defaultArgs);
                callback('onInvalid', p.invalid.length > 0, [val, e, el, p.invalid, options]);
            }
        };


        // public methods
        jMask.mask = mask;
        jMask.options = options;
        jMask.remove = function() {
            var caret = p.getCaret();
            p.destroyEvents();
            p.val(jMask.getCleanVal());
            p.setCaret(caret - p.getMCharsBeforeCount(caret));
            return el;
        };

        // get value without mask
        jMask.getCleanVal = function() {
           return p.getMasked(true);
        };

       jMask.init = function(onlyMask) {
            onlyMask = onlyMask || false;
            options = options || {};

            jMask.byPassKeys = $.jMaskGlobals.byPassKeys;
            jMask.translation = $.jMaskGlobals.translation;

            jMask.translation = $.extend({}, jMask.translation, options.translation);
            jMask = $.extend(true, {}, jMask, options);

            regexMask = p.getRegexMask();

            if (onlyMask === false) {

                if (options.placeholder) {
                    el.attr('placeholder' , options.placeholder);
                }

                // this is necessary, otherwise if the user submit the form
                // and then press the "back" button, the autocomplete will erase
                // the data. Works fine on IE9+, FF, Opera, Safari.
                if ($('input').length && 'oninput' in $('input')[0] === false && el.attr('autocomplete') === 'on') {
                  el.attr('autocomplete', 'off');
                }

                p.destroyEvents();
                p.events();

                var caret = p.getCaret();
                p.val(p.getMasked());
                p.setCaret(caret + p.getMCharsBeforeCount(caret, true));

            } else {
                p.events();
                p.val(p.getMasked());
            }
        };

        jMask.init(!el.is('input'));
    };

    $.maskWatchers = {};
    var HTMLAttributes = function () {
            var input = $(this),
                options = {},
                prefix = 'data-mask-',
                mask = input.attr('data-mask');

            if (input.attr(prefix + 'reverse')) {
                options.reverse = true;
            }

            if (input.attr(prefix + 'clearifnotmatch')) {
                options.clearIfNotMatch = true;
            }

            if (input.attr(prefix + 'selectonfocus') === 'true') {
               options.selectOnFocus = true;
            }

            if (notSameMaskObject(input, mask, options)) {
                return input.data('mask', new Mask(this, mask, options));
            }
        },
        notSameMaskObject = function(field, mask, options) {
            options = options || {};
            var maskObject = $(field).data('mask'),
                stringify = JSON.stringify,
                value = $(field).val() || $(field).text();
            try {
                if (typeof mask === 'function') {
                    mask = mask(value);
                }
                return typeof maskObject !== 'object' || stringify(maskObject.options) !== stringify(options) || maskObject.mask !== mask;
            } catch (e) {}
        };


    $.fn.mask = function(mask, options) {
        options = options || {};
        var selector = this.selector,
            globals = $.jMaskGlobals,
            interval = $.jMaskGlobals.watchInterval,
            maskFunction = function() {
                if (notSameMaskObject(this, mask, options)) {
                    return $(this).data('mask', new Mask(this, mask, options));
                }
            };

        $(this).each(maskFunction);

        if (selector && selector !== '' && globals.watchInputs) {
            clearInterval($.maskWatchers[selector]);
            $.maskWatchers[selector] = setInterval(function(){
                $(document).find(selector).each(maskFunction);
            }, interval);
        }
        return this;
    };

    $.fn.unmask = function() {
        clearInterval($.maskWatchers[this.selector]);
        delete $.maskWatchers[this.selector];
        return this.each(function() {
            var dataMask = $(this).data('mask');
            if (dataMask) {
                dataMask.remove().removeData('mask');
            }
        });
    };

    $.fn.cleanVal = function() {
        return this.data('mask').getCleanVal();
    };

    $.applyDataMask = function(selector) {
        selector = selector || $.jMaskGlobals.maskElements;
        var $selector = (selector instanceof $) ? selector : $(selector);
        $selector.filter($.jMaskGlobals.dataMaskAttr).each(HTMLAttributes);
    };

    var globals = {
        maskElements: 'input,td,span,div',
        dataMaskAttr: '*[data-mask]',
        dataMask: true,
        watchInterval: 300,
        watchInputs: true,
        watchDataMask: false,
        byPassKeys: [9, 16, 17, 18, 36, 37, 38, 39, 40, 91],
        translation: {
            '0': {pattern: /\d/},
            '9': {pattern: /\d/, optional: true},
            '#': {pattern: /\d/, recursive: true},
            'A': {pattern: /[a-zA-Z0-9]/},
            'S': {pattern: /[a-zA-Z]/}
        }
    };

    $.jMaskGlobals = $.jMaskGlobals || {};
    globals = $.jMaskGlobals = $.extend(true, {}, globals, $.jMaskGlobals);

    // looking for inputs with data-mask attribute
    if (globals.dataMask) { $.applyDataMask(); }

    setInterval(function(){
        if ($.jMaskGlobals.watchDataMask) { $.applyDataMask(); }
    }, globals.watchInterval);
}));

/**
 * jQuery Form Validator
 * ------------------------------------------
 * Created by Victor Jonsson <http://www.victorjonsson.se>
 *
 * @website http://formvalidator.net/
 * @license MIT
 * @version 2.2.81
 */
(function ($) {

  'use strict';

  var $window = $(window),
    _getInputParentContainer = function ($elem) {
      if ($elem.valAttr('error-msg-container')) {
        return $($elem.valAttr('error-msg-container'));
      } else {
        var $parent = $elem.parent();
        if ( !$parent.hasClass('form-group') && !$parent.closest('form').hasClass('form-horizontal') ) {
          var $formGroup = $parent.closest('.form-group');
          if ($formGroup.length) {
            return $formGroup.eq(0);
          }
        }
        return $parent;
      }
    },
    _applyErrorStyle = function ($elem, conf) {
      $elem
        .addClass(conf.errorElementClass)
        .removeClass('valid');

      _getInputParentContainer($elem)
        .addClass(conf.inputParentClassOnError)
        .removeClass(conf.inputParentClassOnSuccess);

      if (conf.borderColorOnError !== '') {
        $elem.css('border-color', conf.borderColorOnError);
      }
    },
    _removeErrorStyle = function ($elem, conf) {
      $elem.each(function () {
        var $this = $(this);

        _setInlineErrorMessage($this, '', conf, conf.errorMessagePosition);

        $this
          .removeClass('valid')
          .removeClass(conf.errorElementClass)
          .css('border-color', '');

        _getInputParentContainer($this)
          .removeClass(conf.inputParentClassOnError)
          .removeClass(conf.inputParentClassOnSuccess)
          .find('.' + conf.errorMessageClass) // remove inline span holding error message
            .remove();
      });
    },
    _setInlineErrorMessage = function ($input, mess, conf, $messageContainer) {
      var custom = document.getElementById($input.attr('name') + '_err_msg'),
          setErrorMessage = function($elem) {
            $window.trigger('validationErrorDisplay', [$input, $elem])
            $elem.html(mess);
          };

      if (custom) {
        setErrorMessage($(custom));
      }
      else if (typeof $messageContainer == 'object') {
        var $found = false;
        $messageContainer.find('.' + conf.errorMessageClass).each(function () {
          if (this.inputReferer == $input[0]) {
            $found = $(this);
            return false;
          }
        });
        if ($found) {
          if (!mess) {
            $found.remove();
          } else {
            setErrorMessage($found);
          }
        } else {
          var $mess = $('<div class="' + conf.errorMessageClass + '"></div>');
          setErrorMessage($mess);
          $mess[0].inputReferer = $input[0];
          $messageContainer.prepend($mess);
        }
      }
      else {

        var $parent = _getInputParentContainer($input),
            $mess = $parent.find('.' + conf.errorMessageClass + '.help-block');

        if ($mess.length == 0) {
          $mess = $('<span></span>').addClass('help-block').addClass(conf.errorMessageClass);
          $mess.appendTo($parent);
        }

        setErrorMessage($mess);
      }
    },
    _templateMessage = function ($form, title, errorMessages, conf) {
      var messages = conf.errorMessageTemplate.messages.replace(/\{errorTitle\}/g, title),
          fields = [],
          container;

      $.each(errorMessages, function (i, msg) {
        fields.push(conf.errorMessageTemplate.field.replace(/\{msg\}/g, msg));
      });

      messages = messages.replace(/\{fields\}/g, fields.join(''));
      container = conf.errorMessageTemplate.container.replace(/\{errorMessageClass\}/g, conf.errorMessageClass);
      container = container.replace(/\{messages\}/g, messages);
      $form.children().eq(0).before(container);
    };


  /**
   * Assigns validateInputOnBlur function to elements blur event
   *
   * @param {Object} language Optional, will override $.formUtils.LANG
   * @param {Object} conf Optional, will override the default settings
   * @return {jQuery}
   */
  $.fn.validateOnBlur = function (language, conf) {
    this.find('*[data-validation]')
      .bind('blur.validation', function () {
        $(this).validateInputOnBlur(language, conf, true, 'blur');
      });
    if (conf.validateCheckboxRadioOnClick) {
      // bind click event to validate on click for radio & checkboxes for nice UX
      this.find('input[type=checkbox][data-validation],input[type=radio][data-validation]')
        .bind('click.validation', function () {
          $(this).validateInputOnBlur(language, conf, true, 'click');
        });
    }

    return this;
  };

  /*
   * Assigns validateInputOnBlur function to elements custom event
   * @param {Object} language Optional, will override $.formUtils.LANG
   * @param {Object} settings Optional, will override the default settings
   * * @return {jQuery}
   */
  $.fn.validateOnEvent = function (language, settings) {
    this.find('*[data-validation-event]')
      .each(function () {
        var $el = $(this),
            etype = $el.valAttr("event");
        if (etype) {
          $el
            .unbind(etype + ".validation")
            .bind(etype + ".validation", function () {
              $(this).validateInputOnBlur(language, settings, true, etype);
            });
        }
      });
    return this;
  };

  /**
   * fade in help message when input gains focus
   * fade out when input loses focus
   * <input data-help="The info that I want to display for the user when input is focused" ... />
   *
   * @param {String} attrName - Optional, default is data-help
   * @return {jQuery}
   */
  $.fn.showHelpOnFocus = function (attrName) {
    if (!attrName) {
      attrName = 'data-validation-help';
    }

    // Remove previously added event listeners
    this.find('.has-help-txt')
      .valAttr('has-keyup-event', false)
      .removeClass('has-help-txt');

    // Add help text listeners
    this.find('textarea,input').each(function () {
      var $elem = $(this),
          className = 'jquery_form_help_' + ($elem.attr('name') || '').replace(/(:|\.|\[|\])/g, ""),
          help = $elem.attr(attrName);

      if (help) {
        $elem
          .addClass('has-help-txt')
          .unbind('focus.help')
          .bind('focus.help', function () {
            var $help = $elem.parent().find('.' + className);
            if ($help.length == 0) {
              $help = $('<span />')
                        .addClass(className)
                        .addClass('help')
                        .addClass('help-block') // twitter bs
                        .text(help)
                        .hide();

              $elem.after($help);
            }
            $help.fadeIn();
          })
          .unbind('blur.help')
          .bind('blur.help', function () {
            $(this)
              .parent()
              .find('.' + className)
              .fadeOut('slow');
          });
      }
    });

    return this;
  };

  /**
   * @param {Function} cb
   * @param {Object} [conf]
   * @param {Object} [lang]
   */
  $.fn.validate = function(cb, conf, lang) {
    var language = $.extend({}, $.formUtils.LANG, lang || {});
    this.each(function() {
      var $elem = $(this),
          formDefaultConfig = $elem.closest('form').get(0).validationConfig || {};

      $elem.one('validation', function(evt, isValid) {
        if( typeof cb == 'function' )
          cb(isValid, this, evt);
      });

      $elem.validateInputOnBlur(
          language,
          $.extend({}, formDefaultConfig, conf || {}),
          true
        );
    });
  };

  /**
   * Tells whether or not validation of this input will have to postpone the form submit ()
   * @returns {Boolean}
   */
  $.fn.willPostponeValidation = function() {
    return (this.valAttr('suggestion-nr') ||
            this.valAttr('postpone') ||
            this.hasClass('hasDatepicker'))
          && !window.postponedValidation;
  };

  /**
   * Validate single input when it loses focus
   * shows error message in a span element
   * that is appended to the parent element
   *
   * @param {Object} [language] Optional, will override $.formUtils.LANG
   * @param {Object} [conf] Optional, will override the default settings
   * @param {Boolean} attachKeyupEvent Optional
   * @param {String} eventType
   * @return {jQuery}
   */
  $.fn.validateInputOnBlur = function (language, conf, attachKeyupEvent, eventType) {

    $.formUtils.eventType = eventType;

    if ( this.willPostponeValidation() ) {
      // This validation has to be postponed
      var _self = this,
          postponeTime = this.valAttr('postpone') || 200;

      window.postponedValidation = function () {
        _self.validateInputOnBlur(language, conf, attachKeyupEvent, eventType);
        window.postponedValidation = false;
      };

      setTimeout(function () {
        if (window.postponedValidation) {
          window.postponedValidation();
        }
      }, postponeTime);

      return this;
    }

    language = $.extend({}, $.formUtils.LANG, language || {});
    _removeErrorStyle(this, conf);
    var $elem = this,
        $form = $elem.closest("form"),
        validationRule = $elem.attr(conf.validationRuleAttribute),
        result = $.formUtils.validateInput(
                    $elem,
                    language,
                    conf,
                    $form,
                    eventType
                  );

    if ( result.isValid ) {
      if( result.shouldChangeDisplay ) {
          $elem.addClass('valid');
          _getInputParentContainer($elem)
            .addClass(conf.inputParentClassOnSuccess);
      }
    }
    else if (!result.isValid) {

      _applyErrorStyle($elem, conf);
      _setInlineErrorMessage($elem, result.errorMsg, conf, conf.errorMessagePosition);

      if (attachKeyupEvent) {
        $elem
          .unbind('keyup.validation')
          .bind('keyup.validation', function () {
            $(this).validateInputOnBlur(language, conf, false, 'keyup');
          });
      }
    }

    return this;
  };

  /**
   * Short hand for fetching/adding/removing element attributes
   * prefixed with 'data-validation-'
   *
   * @param {String} name
   * @param {String|Boolean} [val]
   * @return string|undefined
   * @protected
   */
  $.fn.valAttr = function (name, val) {
    if (val === undefined) {
      return this.attr('data-validation-' + name);
    } else if (val === false || val === null) {
      return this.removeAttr('data-validation-' + name);
    } else {
      if (name.length > 0) name = '-' + name;
      return this.attr('data-validation' + name, val);
    }
  };

  /**
   * Function that validates all inputs in active form
   *
   * @param {Object} [language]
   * @param {Object} [conf]
   * @param {Boolean} [displayError] Defaults to true
   */
  $.fn.isValid = function (language, conf, displayError) {

    if ($.formUtils.isLoadingModules) {
      var $self = this;
      setTimeout(function () {
        $self.isValid(language, conf, displayError);
      }, 200);
      return null;
    }

    conf = $.extend({}, $.formUtils.defaultConfig(), conf || {});
    language = $.extend({}, $.formUtils.LANG, language || {});
    displayError = displayError !== false;

    if ($.formUtils.errorDisplayPreventedWhenHalted) {
      // isValid() was called programmatically with argument displayError set
      // to false when the validation was halted by any of the validators
      delete $.formUtils.errorDisplayPreventedWhenHalted
      displayError = false;
    }

    $.formUtils.isValidatingEntireForm = true;
    $.formUtils.haltValidation = false;

    /**
     * Adds message to error message stack if not already in the message stack
     *
     * @param {String} mess
     * @para {jQuery} $elem
     */
    var addErrorMessage = function (mess, $elem) {
          if ($.inArray(mess, errorMessages) < 0) {
            errorMessages.push(mess);
          }
          errorInputs.push($elem);
          $elem.attr('current-error', mess);
          if (displayError)
            _applyErrorStyle($elem, conf);
        },

        /** Holds inputs (of type checkox or radio) already validated, to prevent recheck of mulitple checkboxes & radios */
        checkedInputs = [],

        /** Error messages for this validation */
        errorMessages = [],

        /** Input elements which value was not valid */
        errorInputs = [],

        /** Form instance */
        $form = this,

      /**
       * Tells whether or not to validate element with this name and of this type
       *
       * @param {String} name
       * @param {String} type
       * @return {Boolean}
       */
        ignoreInput = function (name, type) {
        if (type === 'submit' || type === 'button' || type == 'reset') {
          return true;
        }
        return $.inArray(name, conf.ignore || []) > -1;
      };

    // Reset style and remove error class
    if (displayError) {
      $form.find('.' + conf.errorMessageClass + '.alert').remove();
      _removeErrorStyle($form.find('.' + conf.errorElementClass + ',.valid'), conf);
    }

    // Validate element values
    $form.find('input,textarea,select').filter(':not([type="submit"],[type="button"])').each(function () {
      var $elem = $(this),
        elementType = $elem.attr('type'),
        isCheckboxOrRadioBtn = elementType == 'radio' || elementType == 'checkbox',
        elementName = $elem.attr('name');

      if (!ignoreInput(elementName, elementType) && (!isCheckboxOrRadioBtn || $.inArray(elementName, checkedInputs) < 0)) {

        if (isCheckboxOrRadioBtn)
          checkedInputs.push(elementName);

        var result = $.formUtils.validateInput(
                              $elem,
                              language,
                              conf,
                              $form,
                              'submit'
                            );

        if( result.shouldChangeDisplay ) {
          if ( !result.isValid ) {
            addErrorMessage(result.errorMsg, $elem);
          } else if( result.isValid ) {
            $elem
              .valAttr('current-error', false)
              .addClass('valid');

            _getInputParentContainer($elem)
              .addClass(conf.inputParentClassOnSuccess);
          }
        }
      }
    });

    // Run validation callback
    if (typeof conf.onValidate == 'function') {
      var errors = conf.onValidate($form);
      if ($.isArray(errors)) {
        $.each(errors, function (i, err) {
          addErrorMessage(err.message, err.element);
        });
      }
      else if (errors && errors.element && errors.message) {
        addErrorMessage(errors.message, errors.element);
      }
    }

    // Reset form validation flag
    $.formUtils.isValidatingEntireForm = false;

    // Validation failed
    if (!$.formUtils.haltValidation && errorInputs.length > 0) {

      if (displayError) {
        // display all error messages in top of form
        if (conf.errorMessagePosition === 'top') {
          _templateMessage($form, language.errorTitle, errorMessages, conf);
        }
        // Customize display message
        else if (conf.errorMessagePosition === 'custom') {
          if (typeof conf.errorMessageCustom === 'function') {
            conf.errorMessageCustom($form, language.errorTitle, errorMessages, conf);
          }
        }
        // Display error message below input field or in defined container
        else {
          $.each(errorInputs, function (i, $input) {
            _setInlineErrorMessage($input, $input.attr('current-error'), conf, conf.errorMessagePosition);
          });
        }

        if (conf.scrollToTopOnError) {
          $window.scrollTop($form.offset().top - 20);
        }
      }

      return false;
    }

    if (!displayError && $.formUtils.haltValidation) {
      $.formUtils.errorDisplayPreventedWhenHalted = true;
    }

    return !$.formUtils.haltValidation;
  };

  /**
   * @deprecated
   * @param language
   * @param conf
   */
  $.fn.validateForm = function (language, conf) {
    if (window.console && typeof window.console.warn == 'function') {
      window.console.warn('Use of deprecated function $.validateForm, use $.isValid instead');
    }
    return this.isValid(language, conf, true);
  }

  /**
   * Plugin for displaying input length restriction
   */
  $.fn.restrictLength = function (maxLengthElement) {
    new $.formUtils.lengthRestriction(this, maxLengthElement);
    return this;
  };

  /**
   * Add suggestion dropdown to inputs having data-suggestions with a comma
   * separated string with suggestions
   * @param {Array} [settings]
   * @returns {jQuery}
   */
  $.fn.addSuggestions = function (settings) {
    var sugs = false;
    this.find('input').each(function () {
      var $field = $(this);

      sugs = $.split($field.attr('data-suggestions'));

      if (sugs.length > 0 && !$field.hasClass('has-suggestions')) {
        $.formUtils.suggest($field, sugs, settings);
        $field.addClass('has-suggestions');
      }
    });
    return this;
  };

  /**
   * A bit smarter split function
   * delimiter can be space, comma, dash or pipe
   * @param {String} val
   * @param {Function|String} [callback]
   * @returns {Array|void}
   */
  $.split = function (val, callback) {
    if (typeof callback != 'function') {
      // return array
      if (!val)
        return [];
      var values = [];
      $.each(val.split(callback ? callback : /[,|\-\s]\s*/g),
        function (i, str) {
          str = $.trim(str);
          if (str.length)
            values.push(str);
        }
      );
      return values;
    } else if (val) {
      // exec callback func on each
      $.each(val.split(/[,|\-\s]\s*/g),
        function (i, str) {
          str = $.trim(str);
          if (str.length)
            return callback(str, i);
        }
      );
    }
  };

  /**
   * Short hand function that makes the validation setup require less code
   * @param conf
   */
  $.validate = function (conf) {

    var defaultConf = $.extend($.formUtils.defaultConfig(), {
      form: 'form',
      /*
       * Enable custom event for validation
       */
      validateOnEvent: false,
      validateOnBlur: true,
      validateCheckboxRadioOnClick: true,
      showHelpOnFocus: true,
      addSuggestions: true,
      modules: '',
      onModulesLoaded: null,
      language: false,
      onSuccess: false,
      onError: false,
      onElementValidate: false,
    });

    conf = $.extend(defaultConf, conf || {});

    if( conf.lang && conf.lang != 'en' ) {
      var langModule = 'lang/'+conf.lang+'.js';
      conf.modules += conf.modules.length ? ','+langModule : langModule;
    }

    // Add validation to forms
    $(conf.form).each(function (i, form) {

      // Make a reference to the config for this form
      form.validationConfig = conf;

      // Trigger jQuery event that we're about to setup va
      var $form = $(form);
      $window.trigger('formValidationSetup', [$form, conf]);

      // Remove classes and event handlers that might have been
      // added by a previous call to $.validate
      $form.find('.has-help-txt')
          .unbind('focus.validation')
          .unbind('blur.validation');

      $form
        .removeClass('has-validation-callback')
        .unbind('submit.validation')
        .unbind('reset.validation')
        .find('input[data-validation],textarea[data-validation]')
          .unbind('blur.validation');

      // Validate when submitted
      $form.bind('submit.validation', function () {

        var $form = $(this);

        if ($.formUtils.haltValidation) {
          // pressing several times on submit button while validation is halted
          return false;
        }

        if ($.formUtils.isLoadingModules) {
          setTimeout(function () {
            $form.trigger('submit.validation');
          }, 200);
          return false;
        }

        var valid = $form.isValid(conf.language, conf);

        if ($.formUtils.haltValidation) {
          // Validation got halted by one of the validators
          return false;
        } else {
          if (valid && typeof conf.onSuccess == 'function') {
            var callbackResponse = conf.onSuccess($form);
            if (callbackResponse === false) {
              return false;
            }
          } else if (!valid && typeof conf.onError == 'function') {
            conf.onError($form);
            return false;
          } else {
            return valid;
          }
        }
      })
      .bind('reset.validation', function () {
        // remove messages
        $(this).find('.' + conf.errorMessageClass + '.alert').remove();
        _removeErrorStyle($(this).find('.' + conf.errorElementClass + ',.valid'), conf);
      })
      .addClass('has-validation-callback');

      if (conf.showHelpOnFocus) {
        $form.showHelpOnFocus();
      }
      if (conf.addSuggestions) {
        $form.addSuggestions();
      }
      if (conf.validateOnBlur) {
        $form.validateOnBlur(conf.language, conf);
        $form.bind('html5ValidationAttrsFound', function () {
          $form.validateOnBlur(conf.language, conf);
        })
      }
      if (conf.validateOnEvent) {
        $form.validateOnEvent(conf.language, conf);
      }
    });

    if (conf.modules != '') {
      $.formUtils.loadModules(conf.modules, false, function() {
        if (typeof conf.onModulesLoaded == 'function') {
          conf.onModulesLoaded();
        }
        $window.trigger('validatorsLoaded', [typeof conf.form == 'string' ? $(conf.form) : conf.form, conf]);
      });
    }
  };

  /**
   * Object containing utility methods for this plugin
   */
  $.formUtils = {

    /**
     * Default config for $(...).isValid();
     */
    defaultConfig: function () {
      return {
        ignore: [], // Names of inputs not to be validated even though node attribute containing the validation rules tells us to
        errorElementClass: 'error', // Class that will be put on elements which value is invalid
        borderColorOnError: '#b94a48', // Border color of elements which value is invalid, empty string to not change border color
        errorMessageClass: 'form-error', // class name of div containing error messages when validation fails
        validationRuleAttribute: 'data-validation', // name of the attribute holding the validation rules
        validationErrorMsgAttribute: 'data-validation-error-msg', // define custom err msg inline with element
        errorMessagePosition: 'element', // Can be either "top" or "element" or "custom"
        errorMessageTemplate: {
          container: '<div class="{errorMessageClass} alert alert-danger">{messages}</div>',
          messages: '<strong>{errorTitle}</strong><ul>{fields}</ul>',
          field: '<li>{msg}</li>'
        },
        errorMessageCustom: _templateMessage,
        scrollToTopOnError: true,
        dateFormat: 'yyyy-mm-dd',
        addValidClassOnAll: false, // whether or not to apply class="valid" even if the input wasn't validated
        decimalSeparator: '.',
        inputParentClassOnError: 'has-error', // twitter-bootstrap default class name
        inputParentClassOnSuccess: 'has-success', // twitter-bootstrap default class name
        validateHiddenInputs: false, // whether or not hidden inputs should be validated
      }
    },

    /**
     * Available validators
     */
    validators: {},

    /**
     * Events triggered by form validator
     */
    _events: {load: [], valid: [], invalid: []},

    /**
     * Setting this property to true during validation will
     * stop further validation from taking place and form will
     * not be sent
     */
    haltValidation: false,

    /**
     * This variable will be true $.fn.isValid() is called
     * and false when $.fn.validateOnBlur is called
     */
    isValidatingEntireForm: false,

    /**
     * Function for adding a validator
     * @param {Object} validator
     */
    addValidator: function (validator) {
      // prefix with "validate_" for backward compatibility reasons
      var name = validator.name.indexOf('validate_') === 0 ? validator.name : 'validate_' + validator.name;
      if (validator.validateOnKeyUp === undefined)
        validator.validateOnKeyUp = true;
      this.validators[name] = validator;
    },

    /**
     * @var {Boolean}
     */
    isLoadingModules: false,

    /**
     * @var {Object}
     */
    loadedModules: {},

    /**
     * @example
     *  $.formUtils.loadModules('date, security.dev');
     *
     * Will load the scripts date.js and security.dev.js from the
     * directory where this script resides. If you want to load
     * the modules from another directory you can use the
     * path argument.
     *
     * The script will be cached by the browser unless the module
     * name ends with .dev
     *
     * @param {String} modules - Comma separated string with module file names (no directory nor file extension)
     * @param {String} [path] - Optional, path where the module files is located if their not in the same directory as the core modules
     * @param {Boolean|function} [fireEvent] - Optional, whether or not to fire event 'load' when modules finished loading
     */
    loadModules: function (modules, path, fireEvent) {

      if (fireEvent === undefined)
        fireEvent = true;

      if ($.formUtils.isLoadingModules) {
        setTimeout(function () {
          $.formUtils.loadModules(modules, path, fireEvent);
        });
        return;
      }

      var hasLoadedAnyModule = false,
        loadModuleScripts = function (modules, path) {

          var moduleList = $.split(modules),
            numModules = moduleList.length,
            moduleLoadedCallback = function () {
              numModules--;
              if (numModules == 0) {
                $.formUtils.isLoadingModules = false;
                if (fireEvent && hasLoadedAnyModule) {
                  if( typeof fireEvent == 'function' ) {
                    fireEvent();
                  } else {
                    $window.trigger('validatorsLoaded');
                  }
                }
              }
            };


          if (numModules > 0) {
            $.formUtils.isLoadingModules = true;
          }

          var cacheSuffix = '?_=' + ( new Date().getTime() ),
            appendToElement = document.getElementsByTagName('head')[0] || document.getElementsByTagName('body')[0];

          $.each(moduleList, function (i, modName) {
            modName = $.trim(modName);
            if (modName.length == 0) {
              moduleLoadedCallback();
            }
            else {
              var scriptUrl = path + modName + (modName.slice(-3) == '.js' ? '' : '.js'),
                script = document.createElement('SCRIPT');

              if (scriptUrl in $.formUtils.loadedModules) {
                // already loaded
                moduleLoadedCallback();
              }
              else {

                // Remember that this script is loaded
                $.formUtils.loadedModules[scriptUrl] = 1;
                hasLoadedAnyModule = true;

                // Load the script
                script.type = 'text/javascript';
                script.onload = moduleLoadedCallback;
                script.src = scriptUrl + ( scriptUrl.slice(-7) == '.dev.js' ? cacheSuffix : '' );
                script.onerror = function() {
                  if( 'console' in window && window.console.log ) {
                    window.console.log('Unable to load form validation module '+scriptUrl);
                  }
                };
                script.onreadystatechange = function () {
                  // IE 7 fix
                  if (this.readyState == 'complete' || this.readyState == 'loaded') {
                    moduleLoadedCallback();
                    // Handle memory leak in IE
                    this.onload = null;
                    this.onreadystatechange = null;
                  }
                };
                appendToElement.appendChild(script);
              }
            }
          });
        };

      if (path) {
        loadModuleScripts(modules, path);
      } else {
        var findScriptPathAndLoadModules = function () {
          var foundPath = false;
          $('script[src*="form-validator"]').each(function () {
            foundPath = this.src.substr(0, this.src.lastIndexOf('/')) + '/';
            if (foundPath == '/')
              foundPath = '';
            return false;
          });

          if (foundPath !== false) {
            loadModuleScripts(modules, foundPath);
            return true;
          }
          return false;
        };

        if (!findScriptPathAndLoadModules()) {
          $(findScriptPathAndLoadModules);
        }
      }
    },

    /**
     * Validate the value of given element according to the validation rules
     * found in the attribute data-validation. Will return an object representing
     * a validation result, having the props shouldChangeDisplay, isValid and errorMsg
     * @param {jQuery} $elem
     * @param {Object} language ($.formUtils.LANG)
     * @param {Object} conf
     * @param {jQuery} $form
     * @param {String} [eventContext]
     * @return {Object}
     */
    validateInput: function ($elem, language, conf, $form, eventContext) {

      $elem.trigger('beforeValidation');
      conf = conf || $.formUtils.defaultConfig();
      language = language || $.formUtils.LANG;

      var value = $elem.val() || '',
          result = {isValid: true, shouldChangeDisplay:true, errorMsg:''},
          optional = $elem.valAttr('optional'),

          // test if a checkbox forces this element to be validated
          validationDependsOnCheckedInput = false,
          validationDependentInputIsChecked = false,
          validateIfCheckedElement = false,

          // get value of this element's attribute "... if-checked"
          validateIfCheckedElementName = $elem.valAttr('if-checked');

      if ($elem.attr('disabled') || (!$elem.is(':visible') && !conf.validateHiddenInputs)) {
        result.shouldChangeDisplay = false;
        return result;
      }

      // make sure we can proceed
      if (validateIfCheckedElementName != null) {

        // Set the boolean telling us that the validation depends
        // on another input being checked
        validationDependsOnCheckedInput = true;

        // select the checkbox type element in this form
        validateIfCheckedElement = $form.find('input[name="' + validateIfCheckedElementName + '"]');

        // test if it's property "checked" is checked
        if (validateIfCheckedElement.prop('checked')) {
          // set value for validation checkpoint
          validationDependentInputIsChecked = true;
        }
      }

      // validation checkpoint
      // if empty AND optional attribute is present
      // OR depending on a checkbox being checked AND checkbox is checked, return true
      var isInvalidNumberInput = !value && $elem[0].type == 'number';
      if ((!value && optional === 'true' && !isInvalidNumberInput) || (validationDependsOnCheckedInput && !validationDependentInputIsChecked)) {
        result.shouldChangeDisplay = conf.addValidClassOnAll;
        return result;
      }

      var validationRules = $elem.attr(conf.validationRuleAttribute),

        // see if form element has inline err msg attribute
        validationErrorMsg = true;

      if (!validationRules) {
        result.shouldChangeDisplay = conf.addValidClassOnAll;
        return result;
      }

      $.split(validationRules, function (rule) {
        if (rule.indexOf('validate_') !== 0) {
          rule = 'validate_' + rule;
        }

        var validator = $.formUtils.validators[rule];

        if (validator && typeof validator['validatorFunction'] == 'function') {

          // special change of element for checkbox_group rule
          if (rule == 'validate_checkbox_group') {
            // set element to first in group, so error msg attr doesn't need to be set on all elements in group
            $elem = $form.find("[name='" + $elem.attr('name') + "']:eq(0)");
          }

          var isValid = null;
          if (eventContext != 'keyup' || validator.validateOnKeyUp) {
            isValid = validator.validatorFunction(value, $elem, conf, language, $form);
          }

          if (!isValid) {
            validationErrorMsg = null;
            if (isValid !== null) {
              validationErrorMsg = $elem.attr(conf.validationErrorMsgAttribute + '-' + rule.replace('validate_', ''));
              if (!validationErrorMsg) {
                validationErrorMsg = $elem.attr(conf.validationErrorMsgAttribute);
                if (!validationErrorMsg) {
                  validationErrorMsg = language[validator.errorMessageKey];
                  if (!validationErrorMsg)
                    validationErrorMsg = validator.errorMessage;
                }
              }
            }
            return false; // break iteration
          }

        } else {
          throw new Error('Using undefined validator "' + rule + '"');
        }

      }, ' ');

      if (typeof validationErrorMsg == 'string') {
        $elem.trigger('validation', false);
        result.errorMsg = validationErrorMsg;
        result.isValid = false;
        result.shouldChangeDisplay = true;
      } else if (validationErrorMsg === null) {
        result.shouldChangeDisplay = conf.addValidClassOnAll;
      } else {
        $elem.trigger('validation', true);
        result.shouldChangeDisplay = true;
      }

      // Run element validation callback
      if (typeof conf.onElementValidate == 'function' && validationErrorMsg !== null) {
        conf.onElementValidate(result.isValid, $elem, $form, validationErrorMsg);
      }

      return result;
    },

    /**
     * Is it a correct date according to given dateFormat. Will return false if not, otherwise
     * an array 0=>year 1=>month 2=>day
     *
     * @param {String} val
     * @param {String} dateFormat
     * @return {Array}|{Boolean}
     */
    parseDate: function (val, dateFormat) {
      var divider = dateFormat.replace(/[a-zA-Z]/gi, '').substring(0, 1),
        regexp = '^',
        formatParts = dateFormat.split(divider || null),
        matches, day, month, year;

      $.each(formatParts, function (i, part) {
        regexp += (i > 0 ? '\\' + divider : '') + '(\\d{' + part.length + '})';
      });

      regexp += '$';

      matches = val.match(new RegExp(regexp));
      if (matches === null) {
        return false;
      }

      var findDateUnit = function (unit, formatParts, matches) {
        for (var i = 0; i < formatParts.length; i++) {
          if (formatParts[i].substring(0, 1) === unit) {
            return $.formUtils.parseDateInt(matches[i + 1]);
          }
        }
        return -1;
      };

      month = findDateUnit('m', formatParts, matches);
      day = findDateUnit('d', formatParts, matches);
      year = findDateUnit('y', formatParts, matches);

      if ((month === 2 && day > 28 && (year % 4 !== 0 || year % 100 === 0 && year % 400 !== 0))
        || (month === 2 && day > 29 && (year % 4 === 0 || year % 100 !== 0 && year % 400 === 0))
        || month > 12 || month === 0) {
        return false;
      }
      if ((this.isShortMonth(month) && day > 30) || (!this.isShortMonth(month) && day > 31) || day === 0) {
        return false;
      }

      return [year, month, day];
    },

    /**
     * skum fix. är talet 05 eller lägre ger parseInt rätt int annars får man 0 när man kör parseInt?
     *
     * @param {String} val
     * @param {Number}
     */
    parseDateInt: function (val) {
      if (val.indexOf('0') === 0) {
        val = val.replace('0', '');
      }
      return parseInt(val, 10);
    },

    /**
     * Has month only 30 days?
     *
     * @param {Number} m
     * @return {Boolean}
     */
    isShortMonth: function (m) {
      return (m % 2 === 0 && m < 7) || (m % 2 !== 0 && m > 7);
    },

    /**
     * Restrict input length
     *
     * @param {jQuery} $inputElement Jquery Html object
     * @param {jQuery} $maxLengthElement jQuery Html Object
     * @return void
     */
    lengthRestriction: function ($inputElement, $maxLengthElement) {
      // read maxChars from counter display initial text value
      var maxChars = parseInt($maxLengthElement.text(), 10),
        charsLeft = 0,

      // internal function does the counting and sets display value
        countCharacters = function () {
          var numChars = $inputElement.val().length;
          if (numChars > maxChars) {
            // get current scroll bar position
            var currScrollTopPos = $inputElement.scrollTop();
            // trim value to max length
            $inputElement.val($inputElement.val().substring(0, maxChars));
            $inputElement.scrollTop(currScrollTopPos);
          }
          charsLeft = maxChars - numChars;
          if (charsLeft < 0)
            charsLeft = 0;

          // set counter text
          $maxLengthElement.text(charsLeft);
        };

      // bind events to this element
      // setTimeout is needed, cut or paste fires before val is available
      $($inputElement).bind('keydown keyup keypress focus blur', countCharacters)
        .bind('cut paste', function () {
          setTimeout(countCharacters, 100);
        });

      // count chars on pageload, if there are prefilled input-values
      $(document).bind("ready", countCharacters);
    },

    /**
     * Test numeric against allowed range
     *
     * @param $value int
     * @param $rangeAllowed str; (1-2, min1, max2, 10)
     * @return array
     */
    numericRangeCheck: function (value, rangeAllowed) {
      // split by dash
      var range = $.split(rangeAllowed),
          // min or max
          minmax = parseInt(rangeAllowed.substr(3), 10);

      if( range.length == 1 && rangeAllowed.indexOf('min') == -1 && rangeAllowed.indexOf('max') == -1 ) {
        range = [rangeAllowed, rangeAllowed]; // only a number, checking agains an exact number of characters
      }

      // range ?
      if (range.length == 2 && (value < parseInt(range[0], 10) || value > parseInt(range[1], 10) )) {
        return [ "out", range[0], range[1] ];
      } // value is out of range
      else if (rangeAllowed.indexOf('min') === 0 && (value < minmax )) // min
      {
        return ["min", minmax];
      } // value is below min
      else if (rangeAllowed.indexOf('max') === 0 && (value > minmax )) // max
      {
        return ["max", minmax];
      } // value is above max
      // since no other returns executed, value is in allowed range
      return [ "ok" ];
    },


    _numSuggestionElements: 0,
    _selectedSuggestion: null,
    _previousTypedVal: null,

    /**
     * Utility function that can be used to create plugins that gives
     * suggestions when inputs is typed into
     * @param {jQuery} $elem
     * @param {Array} suggestions
     * @param {Object} settings - Optional
     * @return {jQuery}
     */
    suggest: function ($elem, suggestions, settings) {
      var conf = {
          css: {
            maxHeight: '150px',
            background: '#FFF',
            lineHeight: '150%',
            textDecoration: 'underline',
            overflowX: 'hidden',
            overflowY: 'auto',
            border: '#CCC solid 1px',
            borderTop: 'none',
            cursor: 'pointer'
          },
          activeSuggestionCSS: {
            background: '#E9E9E9'
          }
        },
        setSuggsetionPosition = function ($suggestionContainer, $input) {
          var offset = $input.offset();
          $suggestionContainer.css({
            width: $input.outerWidth(),
            left: offset.left + 'px',
            top: (offset.top + $input.outerHeight()) + 'px'
          });
        };

      if (settings)
        $.extend(conf, settings);

      conf.css['position'] = 'absolute';
      conf.css['z-index'] = 9999;
      $elem.attr('autocomplete', 'off');

      if (this._numSuggestionElements === 0) {
        // Re-position suggestion container if window size changes
        $window.bind('resize', function () {
          $('.jquery-form-suggestions').each(function () {
            var $container = $(this),
              suggestID = $container.attr('data-suggest-container');
            setSuggsetionPosition($container, $('.suggestions-' + suggestID).eq(0));
          });
        });
      }

      this._numSuggestionElements++;

      var onSelectSuggestion = function ($el) {
        var suggestionId = $el.valAttr('suggestion-nr');
        $.formUtils._selectedSuggestion = null;
        $.formUtils._previousTypedVal = null;
        $('.jquery-form-suggestion-' + suggestionId).fadeOut('fast');
      };

      $elem
        .data('suggestions', suggestions)
        .valAttr('suggestion-nr', this._numSuggestionElements)
        .unbind('focus.suggest')
        .bind('focus.suggest', function () {
          $(this).trigger('keyup');
          $.formUtils._selectedSuggestion = null;
        })
        .unbind('keyup.suggest')
        .bind('keyup.suggest', function () {
          var $input = $(this),
            foundSuggestions = [],
            val = $.trim($input.val()).toLocaleLowerCase();

          if (val == $.formUtils._previousTypedVal) {
            return;
          }
          else {
            $.formUtils._previousTypedVal = val;
          }

          var hasTypedSuggestion = false,
            suggestionId = $input.valAttr('suggestion-nr'),
            $suggestionContainer = $('.jquery-form-suggestion-' + suggestionId);

          $suggestionContainer.scrollTop(0);

          // Find the right suggestions
          if (val != '') {
            var findPartial = val.length > 2;
            $.each($input.data('suggestions'), function (i, suggestion) {
              var lowerCaseVal = suggestion.toLocaleLowerCase();
              if (lowerCaseVal == val) {
                foundSuggestions.push('<strong>' + suggestion + '</strong>');
                hasTypedSuggestion = true;
                return false;
              } else if (lowerCaseVal.indexOf(val) === 0 || (findPartial && lowerCaseVal.indexOf(val) > -1)) {
                foundSuggestions.push(suggestion.replace(new RegExp(val, 'gi'), '<strong>$&</strong>'));
              }
            });
          }

          // Hide suggestion container
          if (hasTypedSuggestion || (foundSuggestions.length == 0 && $suggestionContainer.length > 0)) {
            $suggestionContainer.hide();
          }

          // Create suggestion container if not already exists
          else if (foundSuggestions.length > 0 && $suggestionContainer.length == 0) {
            $suggestionContainer = $('<div></div>').css(conf.css).appendTo('body');
            $elem.addClass('suggestions-' + suggestionId);
            $suggestionContainer
              .attr('data-suggest-container', suggestionId)
              .addClass('jquery-form-suggestions')
              .addClass('jquery-form-suggestion-' + suggestionId);
          }

          // Show hidden container
          else if (foundSuggestions.length > 0 && !$suggestionContainer.is(':visible')) {
            $suggestionContainer.show();
          }

          // add suggestions
          if (foundSuggestions.length > 0 && val.length != foundSuggestions[0].length) {

            // put container in place every time, just in case
            setSuggsetionPosition($suggestionContainer, $input);

            // Add suggestions HTML to container
            $suggestionContainer.html('');
            $.each(foundSuggestions, function (i, text) {
              $('<div></div>')
                .append(text)
                .css({
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  padding: '5px'
                })
                .addClass('form-suggest-element')
                .appendTo($suggestionContainer)
                .click(function () {
                  $input.focus();
                  $input.val($(this).text());
                  onSelectSuggestion($input);
                });
            });
          }
        })
        .unbind('keydown.validation')
        .bind('keydown.validation', function (e) {
          var code = (e.keyCode ? e.keyCode : e.which),
            suggestionId,
            $suggestionContainer,
            $input = $(this);

          if (code == 13 && $.formUtils._selectedSuggestion !== null) {
            suggestionId = $input.valAttr('suggestion-nr');
            $suggestionContainer = $('.jquery-form-suggestion-' + suggestionId);
            if ($suggestionContainer.length > 0) {
              var newText = $suggestionContainer.find('div').eq($.formUtils._selectedSuggestion).text();
              $input.val(newText);
              onSelectSuggestion($input);
              e.preventDefault();
            }
          }
          else {
            suggestionId = $input.valAttr('suggestion-nr');
            $suggestionContainer = $('.jquery-form-suggestion-' + suggestionId);
            var $suggestions = $suggestionContainer.children();
            if ($suggestions.length > 0 && $.inArray(code, [38, 40]) > -1) {
              if (code == 38) { // key up
                if ($.formUtils._selectedSuggestion === null)
                  $.formUtils._selectedSuggestion = $suggestions.length - 1;
                else
                  $.formUtils._selectedSuggestion--;
                if ($.formUtils._selectedSuggestion < 0)
                  $.formUtils._selectedSuggestion = $suggestions.length - 1;
              }
              else if (code == 40) { // key down
                if ($.formUtils._selectedSuggestion === null)
                  $.formUtils._selectedSuggestion = 0;
                else
                  $.formUtils._selectedSuggestion++;
                if ($.formUtils._selectedSuggestion > ($suggestions.length - 1))
                  $.formUtils._selectedSuggestion = 0;

              }

              // Scroll in suggestion window
              var containerInnerHeight = $suggestionContainer.innerHeight(),
                containerScrollTop = $suggestionContainer.scrollTop(),
                suggestionHeight = $suggestionContainer.children().eq(0).outerHeight(),
                activeSuggestionPosY = suggestionHeight * ($.formUtils._selectedSuggestion);

              if (activeSuggestionPosY < containerScrollTop || activeSuggestionPosY > (containerScrollTop + containerInnerHeight)) {
                $suggestionContainer.scrollTop(activeSuggestionPosY);
              }

              $suggestions
                .removeClass('active-suggestion')
                .css('background', 'none')
                .eq($.formUtils._selectedSuggestion)
                .addClass('active-suggestion')
                .css(conf.activeSuggestionCSS);

              e.preventDefault();
              return false;
            }
          }
        })
        .unbind('blur.suggest')
        .bind('blur.suggest', function () {
          onSelectSuggestion($(this));
        });

      return $elem;
    },

    /**
     * Error dialogs
     *
     * @var {Object}
     */
    LANG: {
      errorTitle: 'Form submission failed!',
      requiredFields: 'You have not answered all required fields',
      badTime: 'You have not given a correct time',
      badEmail: 'You have not given a correct e-mail address',
      badTelephone: 'You have not given a correct phone number',
      badSecurityAnswer: 'You have not given a correct answer to the security question',
      badDate: 'You have not given a correct date',
      lengthBadStart: 'The input value must be between ',
      lengthBadEnd: ' characters',
      lengthTooLongStart: 'The input value is longer than ',
      lengthTooShortStart: 'The input value is shorter than ',
      notConfirmed: 'Input values could not be confirmed',
      badDomain: 'Incorrect domain value',
      badUrl: 'The input value is not a correct URL',
      badCustomVal: 'The input value is incorrect',
      andSpaces: ' and spaces ',
      badInt: 'The input value was not a correct number',
      badSecurityNumber: 'Your social security number was incorrect',
      badUKVatAnswer: 'Incorrect UK VAT Number',
      badStrength: 'The password isn\'t strong enough',
      badNumberOfSelectedOptionsStart: 'You have to choose at least ',
      badNumberOfSelectedOptionsEnd: ' answers',
      badAlphaNumeric: 'The input value can only contain alphanumeric characters ',
      badAlphaNumericExtra: ' and ',
      wrongFileSize: 'The file you are trying to upload is too large (max %s)',
      wrongFileType: 'Only files of type %s is allowed',
      groupCheckedRangeStart: 'Please choose between ',
      groupCheckedTooFewStart: 'Please choose at least ',
      groupCheckedTooManyStart: 'Please choose a maximum of ',
      groupCheckedEnd: ' item(s)',
      badCreditCard: 'The credit card number is not correct',
      badCVV: 'The CVV number was not correct',
      wrongFileDim : 'Incorrect image dimensions,',
      imageTooTall : 'the image can not be taller than',
      imageTooWide : 'the image can not be wider than',
      imageTooSmall : 'the image was too small',
      min : 'min',
      max : 'max',
      imageRatioNotAccepted : 'Image ratio is not be accepted',
      badBrazilTelephoneAnswer: 'The phone number entered is invalid',
      badBrazilCEPAnswer: 'The CEP entered is invalid',
      badBrazilCPFAnswer: 'The CPF entered is invalid'
    }
  };


  /* * * * * * * * * * * * * * * * * * * * * *
   CORE VALIDATORS
   * * * * * * * * * * * * * * * * * * * * */


  /*
   * Validate email
   */
  $.formUtils.addValidator({
    name: 'email',
    validatorFunction: function (email) {

      var emailParts = email.toLowerCase().split('@'),
          localPart = emailParts[0],
          domain = emailParts[1];

      if (localPart && domain) {

        if( localPart.indexOf('"') == 0 ) {
          var len = localPart.length;
          localPart = localPart.replace(/\"/g, '');
          if( localPart.length != (len-2) ) {
            return false; // It was not allowed to have more than two apostrophes
          }
        }

        return $.formUtils.validators.validate_domain.validatorFunction(emailParts[1]) &&
              localPart.indexOf('.') != 0 &&
              localPart.substring(localPart.length-1, localPart.length) != '.' &&
              localPart.indexOf('..') == -1 &&
              !(/[^\w\+\.\-\#\-\_\~\!\$\&\'\(\)\*\+\,\;\=\:]/.test(localPart));
      }

      return false;
    },
    errorMessage: '',
    errorMessageKey: 'badEmail'
  });

  /*
   * Validate domain name
   */
  $.formUtils.addValidator({
    name: 'domain',
    validatorFunction: function (val) {
      return val.length > 0 &&
        val.length <= 253 && // Including sub domains
        !(/[^a-zA-Z0-9]/.test(val.slice(-2))) && !(/[^a-zA-Z0-9]/.test(val.substr(0, 1))) && !(/[^a-zA-Z0-9\.\-]/.test(val)) &&
        val.split('..').length == 1 &&
        val.split('.').length > 1;
    },
    errorMessage: '',
    errorMessageKey: 'badDomain'
  });

  /*
   * Validate required
   */
  $.formUtils.addValidator({
    name: 'required',
    validatorFunction: function (val, $el, config, language, $form) {
      switch ($el.attr('type')) {
        case 'checkbox':
          return $el.is(':checked');
        case 'radio':
          return $form.find('input[name="' + $el.attr('name') + '"]').filter(':checked').length > 0;
        default:
          return $.trim(val) !== '';
      }
    },
    errorMessage: '',
    errorMessageKey: 'requiredFields'
  });

  /*
   * Validate length range
   */
  $.formUtils.addValidator({
    name: 'length',
    validatorFunction: function (val, $el, conf, lang) {
      var lengthAllowed = $el.valAttr('length'),
        type = $el.attr('type');

      if (lengthAllowed == undefined) {
        alert('Please add attribute "data-validation-length" to ' + $el[0].nodeName + ' named ' + $el.attr('name'));
        return true;
      }

      // check if length is above min, below max or within range.
      var len = type == 'file' && $el.get(0).files !== undefined ? $el.get(0).files.length : val.length,
        lengthCheckResults = $.formUtils.numericRangeCheck(len, lengthAllowed),
        checkResult;

      switch (lengthCheckResults[0]) {   // outside of allowed range
        case "out":
          this.errorMessage = lang.lengthBadStart + lengthAllowed + lang.lengthBadEnd;
          checkResult = false;
          break;
        // too short
        case "min":
          this.errorMessage = lang.lengthTooShortStart + lengthCheckResults[1] + lang.lengthBadEnd;
          checkResult = false;
          break;
        // too long
        case "max":
          this.errorMessage = lang.lengthTooLongStart + lengthCheckResults[1] + lang.lengthBadEnd;
          checkResult = false;
          break;
        // ok
        default:
          checkResult = true;
      }

      return checkResult;
    },
    errorMessage: '',
    errorMessageKey: ''
  });

  /*
   * Validate url
   */
  $.formUtils.addValidator({
    name: 'url',
    validatorFunction: function (url) {
      // written by Scott Gonzalez: http://projects.scottsplayground.com/iri/
      // - Victor Jonsson added support for arrays in the url ?arg[]=sdfsdf
      // - General improvements made by Stéphane Moureau <https://github.com/TraderStf>
      var urlFilter = /^(https?|ftp):\/\/((((\w|-|\.|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])(\w|-|\.|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])(\w|-|\.|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/(((\w|-|\.|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/((\w|-|\.|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-z]|\d|\[|\]|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#(((\w|-|\.|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i;
      if (urlFilter.test(url)) {
        var domain = url.split('://')[1],
          domainSlashPos = domain.indexOf('/');

        if (domainSlashPos > -1)
          domain = domain.substr(0, domainSlashPos);

        return $.formUtils.validators.validate_domain.validatorFunction(domain); // todo: add support for IP-addresses
      }
      return false;
    },
    errorMessage: '',
    errorMessageKey: 'badUrl'
  });

  /*
   * Validate number (floating or integer)
   */
  $.formUtils.addValidator({
    name: 'number',
    validatorFunction: function (val, $el, conf) {
      if (val !== '') {
        var allowing = $el.valAttr('allowing') || '',
          decimalSeparator = $el.valAttr('decimal-separator') || conf.decimalSeparator,
          allowsRange = false,
          begin, end,
          steps = $el.valAttr('step') || '',
          allowsSteps = false;

        if (allowing.indexOf('number') == -1)
          allowing += ',number';

        if (allowing.indexOf('negative') == -1 && val.indexOf('-') === 0) {
          return false;
        }

        if (allowing.indexOf('range') > -1) {
          begin = parseFloat(allowing.substring(allowing.indexOf("[") + 1, allowing.indexOf(";")));
          end = parseFloat(allowing.substring(allowing.indexOf(";") + 1, allowing.indexOf("]")));
          allowsRange = true;
        }

        if (steps != "")
          allowsSteps = true;

        if (decimalSeparator == ',') {
          if (val.indexOf('.') > -1) {
            return false;
          }
          // Fix for checking range with floats using ,
          val = val.replace(',', '.');
        }

        if (allowing.indexOf('number') > -1 && val.replace(/[0-9-]/g, '') === '' && (!allowsRange || (val >= begin && val <= end)) && (!allowsSteps || (val % steps == 0))) {
          return true;
        }
        if (allowing.indexOf('float') > -1 && val.match(new RegExp('^([0-9-]+)\\.([0-9]+)$')) !== null && (!allowsRange || (val >= begin && val <= end)) && (!allowsSteps || (val % steps == 0))) {
          return true;
        }
      }
      return false;
    },
    errorMessage: '',
    errorMessageKey: 'badInt'
  });

  /*
   * Validate alpha numeric
   */
  $.formUtils.addValidator({
    name: 'alphanumeric',
    validatorFunction: function (val, $el, conf, language) {
      var patternStart = '^([a-zA-Z0-9',
        patternEnd = ']+)$',
        additionalChars = $el.valAttr('allowing'),
        pattern = '';

      if (additionalChars) {
        pattern = patternStart + additionalChars + patternEnd;
        var extra = additionalChars.replace(/\\/g, '');
        if (extra.indexOf(' ') > -1) {
          extra = extra.replace(' ', '');
          extra += language.andSpaces || $.formUtils.LANG.andSpaces;
        }
        this.errorMessage = language.badAlphaNumeric + language.badAlphaNumericExtra + extra;
      } else {
        pattern = patternStart + patternEnd;
        this.errorMessage = language.badAlphaNumeric;
      }

      return new RegExp(pattern).test(val);
    },
    errorMessage: '',
    errorMessageKey: ''
  });

  /*
   * Validate against regexp
   */
  $.formUtils.addValidator({
    name: 'custom',
    validatorFunction: function (val, $el, conf) {
      var regexp = new RegExp($el.valAttr('regexp'));
      return regexp.test(val);
    },
    errorMessage: '',
    errorMessageKey: 'badCustomVal'
  });

  /*
   * Validate date
   */
  $.formUtils.addValidator({
    name: 'date',
    validatorFunction: function (date, $el, conf) {
      var dateFormat = $el.valAttr('format') || conf.dateFormat || 'yyyy-mm-dd';
      return $.formUtils.parseDate(date, dateFormat) !== false;
    },
    errorMessage: '',
    errorMessageKey: 'badDate'
  });


  /*
   * Validate group of checkboxes, validate qty required is checked
   * written by Steve Wasiura : http://stevewasiura.waztech.com
   * element attrs
   *    data-validation="checkbox_group"
   *    data-validation-qty="1-2"  // min 1 max 2
   *    data-validation-error-msg="chose min 1, max of 2 checkboxes"
   */
  $.formUtils.addValidator({
    name: 'checkbox_group',
    validatorFunction: function (val, $el, conf, lang, $form) {
      // preset return var
      var isValid = true,
        // get name of element. since it is a checkbox group, all checkboxes will have same name
        elname = $el.attr('name'),
        // get checkboxes and count the checked ones
        $checkBoxes = $("input[type=checkbox][name^='" + elname + "']", $form),
        checkedCount = $checkBoxes.filter(':checked').length,
        // get el attr that specs qty required / allowed
        qtyAllowed = $el.valAttr('qty');

      if (qtyAllowed == undefined) {
        var elementType = $el.get(0).nodeName;
        alert('Attribute "data-validation-qty" is missing from ' + elementType + ' named ' + $el.attr('name'));
      }

      // call Utility function to check if count is above min, below max, within range etc.
      var qtyCheckResults = $.formUtils.numericRangeCheck(checkedCount, qtyAllowed);

      // results will be array, [0]=result str, [1]=qty int
      switch (qtyCheckResults[0]) {
        // outside allowed range
        case "out":
          this.errorMessage = lang.groupCheckedRangeStart + qtyAllowed + lang.groupCheckedEnd;
          isValid = false;
          break;
        // below min qty
        case "min":
          this.errorMessage = lang.groupCheckedTooFewStart + qtyCheckResults[1] + lang.groupCheckedEnd;
          isValid = false;
          break;
        // above max qty
        case "max":
          this.errorMessage = lang.groupCheckedTooManyStart + qtyCheckResults[1] + lang.groupCheckedEnd;
          isValid = false;
          break;
        // ok
        default:
          isValid = true;
      }

      if( !isValid ) {
        var _triggerOnBlur = function() {
          $checkBoxes.unbind('click', _triggerOnBlur);
          $checkBoxes.filter('*[data-validation]').validateInputOnBlur(lang, conf, false, 'blur');
        };
        $checkBoxes.bind('click', _triggerOnBlur);
      }

      return isValid;
    }
    //   errorMessage : '', // set above in switch statement
    //   errorMessageKey: '' // not used
  });

})(jQuery);

/**
 * jQuery Form Validator Module: Brazil
 * ------------------------------------------
 * Created by Eduardo Cuducos <http://cuducos.me/>
 *
 * This form validation module adds validators typically used on
 * websites in the Brazil. This module adds the following validators:
 *  - cpf
 *  - cep
 *  - brphone
 *
 * @website http://formvalidator.net/#brazil-validators
 * @license MIT
 * @version 2.2.81
 */

$.formUtils.addValidator({
    name : 'cpf',
    validatorFunction : function(string) {

        // Based on this post from DevMedia:
        // http://www.devmedia.com.br/validar-cpf-com-javascript/23916

        // clean up the input (digits only) and set some support vars
        var cpf = string.replace(/\D/g,"");
        var sum1 = 0;
        var sum2 = 0;
        var remainder1 = 0;
        var remainder2 = 0;

        // skip special cases
        if (cpf.length != 11 || cpf == "00000000000") {
            return false;
        }

        // check 1st verification digit
        for (i=1; i<=9; i++) {
            sum1 += parseInt(cpf.substring(i - 1, i)) * (11 - i);
        }
        remainder1 = (sum1 * 10) % 11;
        if (remainder1 >= 10) {
            remainder1 = 0;
        }
        if (remainder1 != parseInt(cpf.substring(9, 10))) {
            return false;
        }

        // check 2nd verification digit
        for (i = 1; i <= 10; i++) {
            sum2 += parseInt(cpf.substring(i - 1, i)) * (12 - i);
        }
        remainder2 = (sum2 * 10) % 11;
        if (remainder2 >= 10) {
            remainder2 = 0;
        }
        if (remainder2 != parseInt(cpf.substring(10, 11))) {
            return false;
        }

        return true;

    },
    errorMessage : '',
    errorMessageKey: 'badBrazilCPFAnswer'

});

$.formUtils.addValidator({
    name : 'brphone',
    validatorFunction : function(string) {

        // validates telefones such as (having X as numbers):
        // (XX) XXXX-XXXX
        // (XX) XXXXX-XXXX
        // XX XXXXXXXX
        // XX XXXXXXXXX
        // XXXXXXXXXX
        // XXXXXXXXXXX
        // +XX XX XXXXX-XXXX
        // +X XX XXXX-XXXX
        // And so on…

        if (string.match(/^(\+[\d]{1,3}[\s]{0,1}){0,1}(\(){0,1}(\d){2}(\)){0,1}(\s){0,1}(\d){4,5}([-. ]){0,1}(\d){4}$/g)) {
            return true;
        }

        return false;

    },
    errorMessage : '',
    errorMessageKey: 'badBrazilTelephoneAnswer'

});

$.formUtils.addValidator({
    name : 'cep',
    validatorFunction : function(string) {

        // validates CEP  such as (having X as numbers):
        // XXXXX-XXX
        // XXXXX.XXX
        // XXXXX XXX
        // XXXXXXXX

        if (string.match(/^(\d){5}([-. ]){0,1}(\d){3}$/g)) {
            return true;
        }

        return false;

    },
    errorMessage : '',
    errorMessageKey: 'badBrazilCEPAnswer'

});

/*!
 * Lightbox v2.8.2
 * by Lokesh Dhakar
 *
 * More info:
 * http://lokeshdhakar.com/projects/lightbox2/
 *
 * Copyright 2007, 2015 Lokesh Dhakar
 * Released under the MIT license
 * https://github.com/lokesh/lightbox2/blob/master/LICENSE
 */

// Uses Node, AMD or browser globals to create a module.
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['jquery'], factory);
    } else if (typeof exports === 'object') {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        module.exports = factory(require('jquery'));
    } else {
        // Browser globals (root is window)
        root.lightbox = factory(root.jQuery);
    }
}(this, function ($) {

  function Lightbox(options) {
    this.album = [];
    this.currentImageIndex = void 0;
    this.init();

    // options
    this.options = $.extend({}, this.constructor.defaults);
    this.option(options);
  }

  // Descriptions of all options available on the demo site:
  // http://lokeshdhakar.com/projects/lightbox2/index.html#options
  Lightbox.defaults = {
    albumLabel: 'Image %1 of %2',
    alwaysShowNavOnTouchDevices: false,
    fadeDuration: 500,
    fitImagesInViewport: true,
    // maxWidth: 800,
    // maxHeight: 600,
    positionFromTop: 50,
    resizeDuration: 700,
    showImageNumberLabel: true,
    wrapAround: false,
    disableScrolling: false
  };

  Lightbox.prototype.option = function(options) {
    $.extend(this.options, options);
  };

  Lightbox.prototype.imageCountLabel = function(currentImageNum, totalImages) {
    return this.options.albumLabel.replace(/%1/g, currentImageNum).replace(/%2/g, totalImages);
  };

  Lightbox.prototype.init = function() {
    this.enable();
    this.build();
  };

  // Loop through anchors and areamaps looking for either data-lightbox attributes or rel attributes
  // that contain 'lightbox'. When these are clicked, start lightbox.
  Lightbox.prototype.enable = function() {
    var self = this;
    $('body').on('click', 'a[rel^=lightbox], area[rel^=lightbox], a[data-lightbox], area[data-lightbox]', function(event) {
      self.start($(event.currentTarget));
      return false;
    });
  };

  // Build html for the lightbox and the overlay.
  // Attach event handlers to the new DOM elements. click click click
  Lightbox.prototype.build = function() {
    var self = this;
    $('<div id="lightboxOverlay" class="lightboxOverlay"></div><div id="lightbox" class="lightbox"><div class="lb-outerContainer"><div class="lb-container"><img class="lb-image" src="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==" /><div class="lb-nav"><a class="lb-prev" href="" ></a><a class="lb-next" href="" ></a></div><div class="lb-loader"><a class="lb-cancel"></a></div></div></div><div class="lb-dataContainer"><div class="lb-data"><div class="lb-details"><span class="lb-caption"></span><span class="lb-number"></span></div><div class="lb-closeContainer"><a class="lb-close"></a></div></div></div></div>').appendTo($('body'));

    // Cache jQuery objects
    this.$lightbox       = $('#lightbox');
    this.$overlay        = $('#lightboxOverlay');
    this.$outerContainer = this.$lightbox.find('.lb-outerContainer');
    this.$container      = this.$lightbox.find('.lb-container');

    // Store css values for future lookup
    this.containerTopPadding = parseInt(this.$container.css('padding-top'), 10);
    this.containerRightPadding = parseInt(this.$container.css('padding-right'), 10);
    this.containerBottomPadding = parseInt(this.$container.css('padding-bottom'), 10);
    this.containerLeftPadding = parseInt(this.$container.css('padding-left'), 10);

    // Attach event handlers to the newly minted DOM elements
    this.$overlay.hide().on('click', function() {
      self.end();
      return false;
    });

    this.$lightbox.hide().on('click', function(event) {
      if ($(event.target).attr('id') === 'lightbox') {
        self.end();
      }
      return false;
    });

    this.$outerContainer.on('click', function(event) {
      if ($(event.target).attr('id') === 'lightbox') {
        self.end();
      }
      return false;
    });

    this.$lightbox.find('.lb-prev').on('click', function() {
      if (self.currentImageIndex === 0) {
        self.changeImage(self.album.length - 1);
      } else {
        self.changeImage(self.currentImageIndex - 1);
      }
      return false;
    });

    this.$lightbox.find('.lb-next').on('click', function() {
      if (self.currentImageIndex === self.album.length - 1) {
        self.changeImage(0);
      } else {
        self.changeImage(self.currentImageIndex + 1);
      }
      return false;
    });

    this.$lightbox.find('.lb-loader, .lb-close').on('click', function() {
      self.end();
      return false;
    });
  };

  // Show overlay and lightbox. If the image is part of a set, add siblings to album array.
  Lightbox.prototype.start = function($link) {
    var self    = this;
    var $window = $(window);

    $window.on('resize', $.proxy(this.sizeOverlay, this));

    $('select, object, embed').css({
      visibility: 'hidden'
    });

    this.sizeOverlay();

    this.album = [];
    var imageNumber = 0;

    function addToAlbum($link) {
      self.album.push({
        link: $link.attr('href'),
        title: $link.attr('data-title') || $link.attr('title')
      });
    }

    // Support both data-lightbox attribute and rel attribute implementations
    var dataLightboxValue = $link.attr('data-lightbox');
    var $links;

    if (dataLightboxValue) {
      $links = $($link.prop('tagName') + '[data-lightbox="' + dataLightboxValue + '"]');
      for (var i = 0; i < $links.length; i = ++i) {
        addToAlbum($($links[i]));
        if ($links[i] === $link[0]) {
          imageNumber = i;
        }
      }
    } else {
      if ($link.attr('rel') === 'lightbox') {
        // If image is not part of a set
        addToAlbum($link);
      } else {
        // If image is part of a set
        $links = $($link.prop('tagName') + '[rel="' + $link.attr('rel') + '"]');
        for (var j = 0; j < $links.length; j = ++j) {
          addToAlbum($($links[j]));
          if ($links[j] === $link[0]) {
            imageNumber = j;
          }
        }
      }
    }

    // Position Lightbox
    var top  = $window.scrollTop() + this.options.positionFromTop;
    var left = $window.scrollLeft();
    this.$lightbox.css({
      top: top + 'px',
      left: left + 'px'
    }).fadeIn(this.options.fadeDuration);

    // Disable scrolling of the page while open
    if (this.options.disableScrolling) {
      $('body').addClass('lb-disable-scrolling');
    }

    this.changeImage(imageNumber);
  };

  // Hide most UI elements in preparation for the animated resizing of the lightbox.
  Lightbox.prototype.changeImage = function(imageNumber) {
    var self = this;

    this.disableKeyboardNav();
    var $image = this.$lightbox.find('.lb-image');

    this.$overlay.fadeIn(this.options.fadeDuration);

    $('.lb-loader').fadeIn('slow');
    this.$lightbox.find('.lb-image, .lb-nav, .lb-prev, .lb-next, .lb-dataContainer, .lb-numbers, .lb-caption').hide();

    this.$outerContainer.addClass('animating');

    // When image to show is preloaded, we send the width and height to sizeContainer()
    var preloader = new Image();
    preloader.onload = function() {
      var $preloader;
      var imageHeight;
      var imageWidth;
      var maxImageHeight;
      var maxImageWidth;
      var windowHeight;
      var windowWidth;

      $image.attr('src', self.album[imageNumber].link);

      $preloader = $(preloader);

      $image.width(preloader.width);
      $image.height(preloader.height);

      if (self.options.fitImagesInViewport) {
        // Fit image inside the viewport.
        // Take into account the border around the image and an additional 10px gutter on each side.

        windowWidth    = $(window).width();
        windowHeight   = $(window).height();
        maxImageWidth  = windowWidth - self.containerLeftPadding - self.containerRightPadding - 20;
        maxImageHeight = windowHeight - self.containerTopPadding - self.containerBottomPadding - 120;

        // Check if image size is larger then maxWidth|maxHeight in settings
        if (self.options.maxWidth && self.options.maxWidth < maxImageWidth) {
          maxImageWidth = self.options.maxWidth;
        }
        if (self.options.maxHeight && self.options.maxHeight < maxImageWidth) {
          maxImageHeight = self.options.maxHeight;
        }

        // Is there a fitting issue?
        if ((preloader.width > maxImageWidth) || (preloader.height > maxImageHeight)) {
          if ((preloader.width / maxImageWidth) > (preloader.height / maxImageHeight)) {
            imageWidth  = maxImageWidth;
            imageHeight = parseInt(preloader.height / (preloader.width / imageWidth), 10);
            $image.width(imageWidth);
            $image.height(imageHeight);
          } else {
            imageHeight = maxImageHeight;
            imageWidth = parseInt(preloader.width / (preloader.height / imageHeight), 10);
            $image.width(imageWidth);
            $image.height(imageHeight);
          }
        }
      }
      self.sizeContainer($image.width(), $image.height());
    };

    preloader.src          = this.album[imageNumber].link;
    this.currentImageIndex = imageNumber;
  };

  // Stretch overlay to fit the viewport
  Lightbox.prototype.sizeOverlay = function() {
    this.$overlay
      .width($(document).width())
      .height($(document).height());
  };

  // Animate the size of the lightbox to fit the image we are showing
  Lightbox.prototype.sizeContainer = function(imageWidth, imageHeight) {
    var self = this;

    var oldWidth  = this.$outerContainer.outerWidth();
    var oldHeight = this.$outerContainer.outerHeight();
    var newWidth  = imageWidth + this.containerLeftPadding + this.containerRightPadding;
    var newHeight = imageHeight + this.containerTopPadding + this.containerBottomPadding;

    function postResize() {
      self.$lightbox.find('.lb-dataContainer').width(newWidth);
      self.$lightbox.find('.lb-prevLink').height(newHeight);
      self.$lightbox.find('.lb-nextLink').height(newHeight);
      self.showImage();
    }

    if (oldWidth !== newWidth || oldHeight !== newHeight) {
      this.$outerContainer.animate({
        width: newWidth,
        height: newHeight
      }, this.options.resizeDuration, 'swing', function() {
        postResize();
      });
    } else {
      postResize();
    }
  };

  // Display the image and its details and begin preload neighboring images.
  Lightbox.prototype.showImage = function() {
    this.$lightbox.find('.lb-loader').stop(true).hide();
    this.$lightbox.find('.lb-image').fadeIn('slow');

    this.updateNav();
    this.updateDetails();
    this.preloadNeighboringImages();
    this.enableKeyboardNav();
  };

  // Display previous and next navigation if appropriate.
  Lightbox.prototype.updateNav = function() {
    // Check to see if the browser supports touch events. If so, we take the conservative approach
    // and assume that mouse hover events are not supported and always show prev/next navigation
    // arrows in image sets.
    var alwaysShowNav = false;
    try {
      document.createEvent('TouchEvent');
      alwaysShowNav = (this.options.alwaysShowNavOnTouchDevices) ? true : false;
    } catch (e) {}

    this.$lightbox.find('.lb-nav').show();

    if (this.album.length > 1) {
      if (this.options.wrapAround) {
        if (alwaysShowNav) {
          this.$lightbox.find('.lb-prev, .lb-next').css('opacity', '1');
        }
        this.$lightbox.find('.lb-prev, .lb-next').show();
      } else {
        if (this.currentImageIndex > 0) {
          this.$lightbox.find('.lb-prev').show();
          if (alwaysShowNav) {
            this.$lightbox.find('.lb-prev').css('opacity', '1');
          }
        }
        if (this.currentImageIndex < this.album.length - 1) {
          this.$lightbox.find('.lb-next').show();
          if (alwaysShowNav) {
            this.$lightbox.find('.lb-next').css('opacity', '1');
          }
        }
      }
    }
  };

  // Display caption, image number, and closing button.
  Lightbox.prototype.updateDetails = function() {
    var self = this;

    // Enable anchor clicks in the injected caption html.
    // Thanks Nate Wright for the fix. @https://github.com/NateWr
    if (typeof this.album[this.currentImageIndex].title !== 'undefined' &&
      this.album[this.currentImageIndex].title !== '') {
      this.$lightbox.find('.lb-caption')
        .html(this.album[this.currentImageIndex].title)
        .fadeIn('fast')
        .find('a').on('click', function(event) {
          if ($(this).attr('target') !== undefined) {
            window.open($(this).attr('href'), $(this).attr('target'));
          } else {
            location.href = $(this).attr('href');
          }
        });
    }

    if (this.album.length > 1 && this.options.showImageNumberLabel) {
      var labelText = this.imageCountLabel(this.currentImageIndex + 1, this.album.length);
      this.$lightbox.find('.lb-number').text(labelText).fadeIn('fast');
    } else {
      this.$lightbox.find('.lb-number').hide();
    }

    this.$outerContainer.removeClass('animating');

    this.$lightbox.find('.lb-dataContainer').fadeIn(this.options.resizeDuration, function() {
      return self.sizeOverlay();
    });
  };

  // Preload previous and next images in set.
  Lightbox.prototype.preloadNeighboringImages = function() {
    if (this.album.length > this.currentImageIndex + 1) {
      var preloadNext = new Image();
      preloadNext.src = this.album[this.currentImageIndex + 1].link;
    }
    if (this.currentImageIndex > 0) {
      var preloadPrev = new Image();
      preloadPrev.src = this.album[this.currentImageIndex - 1].link;
    }
  };

  Lightbox.prototype.enableKeyboardNav = function() {
    $(document).on('keyup.keyboard', $.proxy(this.keyboardAction, this));
  };

  Lightbox.prototype.disableKeyboardNav = function() {
    $(document).off('.keyboard');
  };

  Lightbox.prototype.keyboardAction = function(event) {
    var KEYCODE_ESC        = 27;
    var KEYCODE_LEFTARROW  = 37;
    var KEYCODE_RIGHTARROW = 39;

    var keycode = event.keyCode;
    var key     = String.fromCharCode(keycode).toLowerCase();
    if (keycode === KEYCODE_ESC || key.match(/x|o|c/)) {
      this.end();
    } else if (key === 'p' || keycode === KEYCODE_LEFTARROW) {
      if (this.currentImageIndex !== 0) {
        this.changeImage(this.currentImageIndex - 1);
      } else if (this.options.wrapAround && this.album.length > 1) {
        this.changeImage(this.album.length - 1);
      }
    } else if (key === 'n' || keycode === KEYCODE_RIGHTARROW) {
      if (this.currentImageIndex !== this.album.length - 1) {
        this.changeImage(this.currentImageIndex + 1);
      } else if (this.options.wrapAround && this.album.length > 1) {
        this.changeImage(0);
      }
    }
  };

  // Closing time. :-(
  Lightbox.prototype.end = function() {
    this.disableKeyboardNav();
    $(window).off('resize', this.sizeOverlay);
    this.$lightbox.fadeOut(this.options.fadeDuration);
    this.$overlay.fadeOut(this.options.fadeDuration);
    $('select, object, embed').css({
      visibility: 'visible'
    });
    if (this.options.disableScrolling) {
      $('body').removeClass('lb-disable-scrolling');
    }
  };

  return new Lightbox();
}));

/*
     _ _      _       _
 ___| (_) ___| | __  (_)___
/ __| | |/ __| |/ /  | / __|
\__ \ | | (__|   < _ | \__ \
|___/_|_|\___|_|\_(_)/ |___/
                   |__/

 Version: 1.5.9
  Author: Ken Wheeler
 Website: http://kenwheeler.github.io
    Docs: http://kenwheeler.github.io/slick
    Repo: http://github.com/kenwheeler/slick
  Issues: http://github.com/kenwheeler/slick/issues

 */
!function(a){"use strict";"function"==typeof define&&define.amd?define(["jquery"],a):"undefined"!=typeof exports?module.exports=a(require("jquery")):a(jQuery)}(function(a){"use strict";var b=window.Slick||{};b=function(){function c(c,d){var f,e=this;e.defaults={accessibility:!0,adaptiveHeight:!1,appendArrows:a(c),appendDots:a(c),arrows:!0,asNavFor:null,prevArrow:'<button type="button" data-role="none" class="slick-prev" aria-label="Previous" tabindex="0" role="button">Previous</button>',nextArrow:'<button type="button" data-role="none" class="slick-next" aria-label="Next" tabindex="0" role="button">Next</button>',autoplay:!1,autoplaySpeed:3e3,centerMode:!1,centerPadding:"50px",cssEase:"ease",customPaging:function(a,b){return'<button type="button" data-role="none" role="button" aria-required="false" tabindex="0">'+(b+1)+"</button>"},dots:!1,dotsClass:"slick-dots",draggable:!0,easing:"linear",edgeFriction:.35,fade:!1,focusOnSelect:!1,infinite:!0,initialSlide:0,lazyLoad:"ondemand",mobileFirst:!1,pauseOnHover:!0,pauseOnDotsHover:!1,respondTo:"window",responsive:null,rows:1,rtl:!1,slide:"",slidesPerRow:1,slidesToShow:1,slidesToScroll:1,speed:500,swipe:!0,swipeToSlide:!1,touchMove:!0,touchThreshold:5,useCSS:!0,useTransform:!0,variableWidth:!1,vertical:!1,verticalSwiping:!1,waitForAnimate:!0,zIndex:1e3},e.initials={animating:!1,dragging:!1,autoPlayTimer:null,currentDirection:0,currentLeft:null,currentSlide:0,direction:1,$dots:null,listWidth:null,listHeight:null,loadIndex:0,$nextArrow:null,$prevArrow:null,slideCount:null,slideWidth:null,$slideTrack:null,$slides:null,sliding:!1,slideOffset:0,swipeLeft:null,$list:null,touchObject:{},transformsEnabled:!1,unslicked:!1},a.extend(e,e.initials),e.activeBreakpoint=null,e.animType=null,e.animProp=null,e.breakpoints=[],e.breakpointSettings=[],e.cssTransitions=!1,e.hidden="hidden",e.paused=!1,e.positionProp=null,e.respondTo=null,e.rowCount=1,e.shouldClick=!0,e.$slider=a(c),e.$slidesCache=null,e.transformType=null,e.transitionType=null,e.visibilityChange="visibilitychange",e.windowWidth=0,e.windowTimer=null,f=a(c).data("slick")||{},e.options=a.extend({},e.defaults,f,d),e.currentSlide=e.options.initialSlide,e.originalSettings=e.options,"undefined"!=typeof document.mozHidden?(e.hidden="mozHidden",e.visibilityChange="mozvisibilitychange"):"undefined"!=typeof document.webkitHidden&&(e.hidden="webkitHidden",e.visibilityChange="webkitvisibilitychange"),e.autoPlay=a.proxy(e.autoPlay,e),e.autoPlayClear=a.proxy(e.autoPlayClear,e),e.changeSlide=a.proxy(e.changeSlide,e),e.clickHandler=a.proxy(e.clickHandler,e),e.selectHandler=a.proxy(e.selectHandler,e),e.setPosition=a.proxy(e.setPosition,e),e.swipeHandler=a.proxy(e.swipeHandler,e),e.dragHandler=a.proxy(e.dragHandler,e),e.keyHandler=a.proxy(e.keyHandler,e),e.autoPlayIterator=a.proxy(e.autoPlayIterator,e),e.instanceUid=b++,e.htmlExpr=/^(?:\s*(<[\w\W]+>)[^>]*)$/,e.registerBreakpoints(),e.init(!0),e.checkResponsive(!0)}var b=0;return c}(),b.prototype.addSlide=b.prototype.slickAdd=function(b,c,d){var e=this;if("boolean"==typeof c)d=c,c=null;else if(0>c||c>=e.slideCount)return!1;e.unload(),"number"==typeof c?0===c&&0===e.$slides.length?a(b).appendTo(e.$slideTrack):d?a(b).insertBefore(e.$slides.eq(c)):a(b).insertAfter(e.$slides.eq(c)):d===!0?a(b).prependTo(e.$slideTrack):a(b).appendTo(e.$slideTrack),e.$slides=e.$slideTrack.children(this.options.slide),e.$slideTrack.children(this.options.slide).detach(),e.$slideTrack.append(e.$slides),e.$slides.each(function(b,c){a(c).attr("data-slick-index",b)}),e.$slidesCache=e.$slides,e.reinit()},b.prototype.animateHeight=function(){var a=this;if(1===a.options.slidesToShow&&a.options.adaptiveHeight===!0&&a.options.vertical===!1){var b=a.$slides.eq(a.currentSlide).outerHeight(!0);a.$list.animate({height:b},a.options.speed)}},b.prototype.animateSlide=function(b,c){var d={},e=this;e.animateHeight(),e.options.rtl===!0&&e.options.vertical===!1&&(b=-b),e.transformsEnabled===!1?e.options.vertical===!1?e.$slideTrack.animate({left:b},e.options.speed,e.options.easing,c):e.$slideTrack.animate({top:b},e.options.speed,e.options.easing,c):e.cssTransitions===!1?(e.options.rtl===!0&&(e.currentLeft=-e.currentLeft),a({animStart:e.currentLeft}).animate({animStart:b},{duration:e.options.speed,easing:e.options.easing,step:function(a){a=Math.ceil(a),e.options.vertical===!1?(d[e.animType]="translate("+a+"px, 0px)",e.$slideTrack.css(d)):(d[e.animType]="translate(0px,"+a+"px)",e.$slideTrack.css(d))},complete:function(){c&&c.call()}})):(e.applyTransition(),b=Math.ceil(b),e.options.vertical===!1?d[e.animType]="translate3d("+b+"px, 0px, 0px)":d[e.animType]="translate3d(0px,"+b+"px, 0px)",e.$slideTrack.css(d),c&&setTimeout(function(){e.disableTransition(),c.call()},e.options.speed))},b.prototype.asNavFor=function(b){var c=this,d=c.options.asNavFor;d&&null!==d&&(d=a(d).not(c.$slider)),null!==d&&"object"==typeof d&&d.each(function(){var c=a(this).slick("getSlick");c.unslicked||c.slideHandler(b,!0)})},b.prototype.applyTransition=function(a){var b=this,c={};b.options.fade===!1?c[b.transitionType]=b.transformType+" "+b.options.speed+"ms "+b.options.cssEase:c[b.transitionType]="opacity "+b.options.speed+"ms "+b.options.cssEase,b.options.fade===!1?b.$slideTrack.css(c):b.$slides.eq(a).css(c)},b.prototype.autoPlay=function(){var a=this;a.autoPlayTimer&&clearInterval(a.autoPlayTimer),a.slideCount>a.options.slidesToShow&&a.paused!==!0&&(a.autoPlayTimer=setInterval(a.autoPlayIterator,a.options.autoplaySpeed))},b.prototype.autoPlayClear=function(){var a=this;a.autoPlayTimer&&clearInterval(a.autoPlayTimer)},b.prototype.autoPlayIterator=function(){var a=this;a.options.infinite===!1?1===a.direction?(a.currentSlide+1===a.slideCount-1&&(a.direction=0),a.slideHandler(a.currentSlide+a.options.slidesToScroll)):(a.currentSlide-1===0&&(a.direction=1),a.slideHandler(a.currentSlide-a.options.slidesToScroll)):a.slideHandler(a.currentSlide+a.options.slidesToScroll)},b.prototype.buildArrows=function(){var b=this;b.options.arrows===!0&&(b.$prevArrow=a(b.options.prevArrow).addClass("slick-arrow"),b.$nextArrow=a(b.options.nextArrow).addClass("slick-arrow"),b.slideCount>b.options.slidesToShow?(b.$prevArrow.removeClass("slick-hidden").removeAttr("aria-hidden tabindex"),b.$nextArrow.removeClass("slick-hidden").removeAttr("aria-hidden tabindex"),b.htmlExpr.test(b.options.prevArrow)&&b.$prevArrow.prependTo(b.options.appendArrows),b.htmlExpr.test(b.options.nextArrow)&&b.$nextArrow.appendTo(b.options.appendArrows),b.options.infinite!==!0&&b.$prevArrow.addClass("slick-disabled").attr("aria-disabled","true")):b.$prevArrow.add(b.$nextArrow).addClass("slick-hidden").attr({"aria-disabled":"true",tabindex:"-1"}))},b.prototype.buildDots=function(){var c,d,b=this;if(b.options.dots===!0&&b.slideCount>b.options.slidesToShow){for(d='<ul class="'+b.options.dotsClass+'">',c=0;c<=b.getDotCount();c+=1)d+="<li>"+b.options.customPaging.call(this,b,c)+"</li>";d+="</ul>",b.$dots=a(d).appendTo(b.options.appendDots),b.$dots.find("li").first().addClass("slick-active").attr("aria-hidden","false")}},b.prototype.buildOut=function(){var b=this;b.$slides=b.$slider.children(b.options.slide+":not(.slick-cloned)").addClass("slick-slide"),b.slideCount=b.$slides.length,b.$slides.each(function(b,c){a(c).attr("data-slick-index",b).data("originalStyling",a(c).attr("style")||"")}),b.$slider.addClass("slick-slider"),b.$slideTrack=0===b.slideCount?a('<div class="slick-track"/>').appendTo(b.$slider):b.$slides.wrapAll('<div class="slick-track"/>').parent(),b.$list=b.$slideTrack.wrap('<div aria-live="polite" class="slick-list"/>').parent(),b.$slideTrack.css("opacity",0),(b.options.centerMode===!0||b.options.swipeToSlide===!0)&&(b.options.slidesToScroll=1),a("img[data-lazy]",b.$slider).not("[src]").addClass("slick-loading"),b.setupInfinite(),b.buildArrows(),b.buildDots(),b.updateDots(),b.setSlideClasses("number"==typeof b.currentSlide?b.currentSlide:0),b.options.draggable===!0&&b.$list.addClass("draggable")},b.prototype.buildRows=function(){var b,c,d,e,f,g,h,a=this;if(e=document.createDocumentFragment(),g=a.$slider.children(),a.options.rows>1){for(h=a.options.slidesPerRow*a.options.rows,f=Math.ceil(g.length/h),b=0;f>b;b++){var i=document.createElement("div");for(c=0;c<a.options.rows;c++){var j=document.createElement("div");for(d=0;d<a.options.slidesPerRow;d++){var k=b*h+(c*a.options.slidesPerRow+d);g.get(k)&&j.appendChild(g.get(k))}i.appendChild(j)}e.appendChild(i)}a.$slider.html(e),a.$slider.children().children().children().css({width:100/a.options.slidesPerRow+"%",display:"inline-block"})}},b.prototype.checkResponsive=function(b,c){var e,f,g,d=this,h=!1,i=d.$slider.width(),j=window.innerWidth||a(window).width();if("window"===d.respondTo?g=j:"slider"===d.respondTo?g=i:"min"===d.respondTo&&(g=Math.min(j,i)),d.options.responsive&&d.options.responsive.length&&null!==d.options.responsive){f=null;for(e in d.breakpoints)d.breakpoints.hasOwnProperty(e)&&(d.originalSettings.mobileFirst===!1?g<d.breakpoints[e]&&(f=d.breakpoints[e]):g>d.breakpoints[e]&&(f=d.breakpoints[e]));null!==f?null!==d.activeBreakpoint?(f!==d.activeBreakpoint||c)&&(d.activeBreakpoint=f,"unslick"===d.breakpointSettings[f]?d.unslick(f):(d.options=a.extend({},d.originalSettings,d.breakpointSettings[f]),b===!0&&(d.currentSlide=d.options.initialSlide),d.refresh(b)),h=f):(d.activeBreakpoint=f,"unslick"===d.breakpointSettings[f]?d.unslick(f):(d.options=a.extend({},d.originalSettings,d.breakpointSettings[f]),b===!0&&(d.currentSlide=d.options.initialSlide),d.refresh(b)),h=f):null!==d.activeBreakpoint&&(d.activeBreakpoint=null,d.options=d.originalSettings,b===!0&&(d.currentSlide=d.options.initialSlide),d.refresh(b),h=f),b||h===!1||d.$slider.trigger("breakpoint",[d,h])}},b.prototype.changeSlide=function(b,c){var f,g,h,d=this,e=a(b.target);switch(e.is("a")&&b.preventDefault(),e.is("li")||(e=e.closest("li")),h=d.slideCount%d.options.slidesToScroll!==0,f=h?0:(d.slideCount-d.currentSlide)%d.options.slidesToScroll,b.data.message){case"previous":g=0===f?d.options.slidesToScroll:d.options.slidesToShow-f,d.slideCount>d.options.slidesToShow&&d.slideHandler(d.currentSlide-g,!1,c);break;case"next":g=0===f?d.options.slidesToScroll:f,d.slideCount>d.options.slidesToShow&&d.slideHandler(d.currentSlide+g,!1,c);break;case"index":var i=0===b.data.index?0:b.data.index||e.index()*d.options.slidesToScroll;d.slideHandler(d.checkNavigable(i),!1,c),e.children().trigger("focus");break;default:return}},b.prototype.checkNavigable=function(a){var c,d,b=this;if(c=b.getNavigableIndexes(),d=0,a>c[c.length-1])a=c[c.length-1];else for(var e in c){if(a<c[e]){a=d;break}d=c[e]}return a},b.prototype.cleanUpEvents=function(){var b=this;b.options.dots&&null!==b.$dots&&(a("li",b.$dots).off("click.slick",b.changeSlide),b.options.pauseOnDotsHover===!0&&b.options.autoplay===!0&&a("li",b.$dots).off("mouseenter.slick",a.proxy(b.setPaused,b,!0)).off("mouseleave.slick",a.proxy(b.setPaused,b,!1))),b.options.arrows===!0&&b.slideCount>b.options.slidesToShow&&(b.$prevArrow&&b.$prevArrow.off("click.slick",b.changeSlide),b.$nextArrow&&b.$nextArrow.off("click.slick",b.changeSlide)),b.$list.off("touchstart.slick mousedown.slick",b.swipeHandler),b.$list.off("touchmove.slick mousemove.slick",b.swipeHandler),b.$list.off("touchend.slick mouseup.slick",b.swipeHandler),b.$list.off("touchcancel.slick mouseleave.slick",b.swipeHandler),b.$list.off("click.slick",b.clickHandler),a(document).off(b.visibilityChange,b.visibility),b.$list.off("mouseenter.slick",a.proxy(b.setPaused,b,!0)),b.$list.off("mouseleave.slick",a.proxy(b.setPaused,b,!1)),b.options.accessibility===!0&&b.$list.off("keydown.slick",b.keyHandler),b.options.focusOnSelect===!0&&a(b.$slideTrack).children().off("click.slick",b.selectHandler),a(window).off("orientationchange.slick.slick-"+b.instanceUid,b.orientationChange),a(window).off("resize.slick.slick-"+b.instanceUid,b.resize),a("[draggable!=true]",b.$slideTrack).off("dragstart",b.preventDefault),a(window).off("load.slick.slick-"+b.instanceUid,b.setPosition),a(document).off("ready.slick.slick-"+b.instanceUid,b.setPosition)},b.prototype.cleanUpRows=function(){var b,a=this;a.options.rows>1&&(b=a.$slides.children().children(),b.removeAttr("style"),a.$slider.html(b))},b.prototype.clickHandler=function(a){var b=this;b.shouldClick===!1&&(a.stopImmediatePropagation(),a.stopPropagation(),a.preventDefault())},b.prototype.destroy=function(b){var c=this;c.autoPlayClear(),c.touchObject={},c.cleanUpEvents(),a(".slick-cloned",c.$slider).detach(),c.$dots&&c.$dots.remove(),c.$prevArrow&&c.$prevArrow.length&&(c.$prevArrow.removeClass("slick-disabled slick-arrow slick-hidden").removeAttr("aria-hidden aria-disabled tabindex").css("display",""),c.htmlExpr.test(c.options.prevArrow)&&c.$prevArrow.remove()),c.$nextArrow&&c.$nextArrow.length&&(c.$nextArrow.removeClass("slick-disabled slick-arrow slick-hidden").removeAttr("aria-hidden aria-disabled tabindex").css("display",""),c.htmlExpr.test(c.options.nextArrow)&&c.$nextArrow.remove()),c.$slides&&(c.$slides.removeClass("slick-slide slick-active slick-center slick-visible slick-current").removeAttr("aria-hidden").removeAttr("data-slick-index").each(function(){a(this).attr("style",a(this).data("originalStyling"))}),c.$slideTrack.children(this.options.slide).detach(),c.$slideTrack.detach(),c.$list.detach(),c.$slider.append(c.$slides)),c.cleanUpRows(),c.$slider.removeClass("slick-slider"),c.$slider.removeClass("slick-initialized"),c.unslicked=!0,b||c.$slider.trigger("destroy",[c])},b.prototype.disableTransition=function(a){var b=this,c={};c[b.transitionType]="",b.options.fade===!1?b.$slideTrack.css(c):b.$slides.eq(a).css(c)},b.prototype.fadeSlide=function(a,b){var c=this;c.cssTransitions===!1?(c.$slides.eq(a).css({zIndex:c.options.zIndex}),c.$slides.eq(a).animate({opacity:1},c.options.speed,c.options.easing,b)):(c.applyTransition(a),c.$slides.eq(a).css({opacity:1,zIndex:c.options.zIndex}),b&&setTimeout(function(){c.disableTransition(a),b.call()},c.options.speed))},b.prototype.fadeSlideOut=function(a){var b=this;b.cssTransitions===!1?b.$slides.eq(a).animate({opacity:0,zIndex:b.options.zIndex-2},b.options.speed,b.options.easing):(b.applyTransition(a),b.$slides.eq(a).css({opacity:0,zIndex:b.options.zIndex-2}))},b.prototype.filterSlides=b.prototype.slickFilter=function(a){var b=this;null!==a&&(b.$slidesCache=b.$slides,b.unload(),b.$slideTrack.children(this.options.slide).detach(),b.$slidesCache.filter(a).appendTo(b.$slideTrack),b.reinit())},b.prototype.getCurrent=b.prototype.slickCurrentSlide=function(){var a=this;return a.currentSlide},b.prototype.getDotCount=function(){var a=this,b=0,c=0,d=0;if(a.options.infinite===!0)for(;b<a.slideCount;)++d,b=c+a.options.slidesToScroll,c+=a.options.slidesToScroll<=a.options.slidesToShow?a.options.slidesToScroll:a.options.slidesToShow;else if(a.options.centerMode===!0)d=a.slideCount;else for(;b<a.slideCount;)++d,b=c+a.options.slidesToScroll,c+=a.options.slidesToScroll<=a.options.slidesToShow?a.options.slidesToScroll:a.options.slidesToShow;return d-1},b.prototype.getLeft=function(a){var c,d,f,b=this,e=0;return b.slideOffset=0,d=b.$slides.first().outerHeight(!0),b.options.infinite===!0?(b.slideCount>b.options.slidesToShow&&(b.slideOffset=b.slideWidth*b.options.slidesToShow*-1,e=d*b.options.slidesToShow*-1),b.slideCount%b.options.slidesToScroll!==0&&a+b.options.slidesToScroll>b.slideCount&&b.slideCount>b.options.slidesToShow&&(a>b.slideCount?(b.slideOffset=(b.options.slidesToShow-(a-b.slideCount))*b.slideWidth*-1,e=(b.options.slidesToShow-(a-b.slideCount))*d*-1):(b.slideOffset=b.slideCount%b.options.slidesToScroll*b.slideWidth*-1,e=b.slideCount%b.options.slidesToScroll*d*-1))):a+b.options.slidesToShow>b.slideCount&&(b.slideOffset=(a+b.options.slidesToShow-b.slideCount)*b.slideWidth,e=(a+b.options.slidesToShow-b.slideCount)*d),b.slideCount<=b.options.slidesToShow&&(b.slideOffset=0,e=0),b.options.centerMode===!0&&b.options.infinite===!0?b.slideOffset+=b.slideWidth*Math.floor(b.options.slidesToShow/2)-b.slideWidth:b.options.centerMode===!0&&(b.slideOffset=0,b.slideOffset+=b.slideWidth*Math.floor(b.options.slidesToShow/2)),c=b.options.vertical===!1?a*b.slideWidth*-1+b.slideOffset:a*d*-1+e,b.options.variableWidth===!0&&(f=b.slideCount<=b.options.slidesToShow||b.options.infinite===!1?b.$slideTrack.children(".slick-slide").eq(a):b.$slideTrack.children(".slick-slide").eq(a+b.options.slidesToShow),c=b.options.rtl===!0?f[0]?-1*(b.$slideTrack.width()-f[0].offsetLeft-f.width()):0:f[0]?-1*f[0].offsetLeft:0,b.options.centerMode===!0&&(f=b.slideCount<=b.options.slidesToShow||b.options.infinite===!1?b.$slideTrack.children(".slick-slide").eq(a):b.$slideTrack.children(".slick-slide").eq(a+b.options.slidesToShow+1),c=b.options.rtl===!0?f[0]?-1*(b.$slideTrack.width()-f[0].offsetLeft-f.width()):0:f[0]?-1*f[0].offsetLeft:0,c+=(b.$list.width()-f.outerWidth())/2)),c},b.prototype.getOption=b.prototype.slickGetOption=function(a){var b=this;return b.options[a]},b.prototype.getNavigableIndexes=function(){var e,a=this,b=0,c=0,d=[];for(a.options.infinite===!1?e=a.slideCount:(b=-1*a.options.slidesToScroll,c=-1*a.options.slidesToScroll,e=2*a.slideCount);e>b;)d.push(b),b=c+a.options.slidesToScroll,c+=a.options.slidesToScroll<=a.options.slidesToShow?a.options.slidesToScroll:a.options.slidesToShow;return d},b.prototype.getSlick=function(){return this},b.prototype.getSlideCount=function(){var c,d,e,b=this;return e=b.options.centerMode===!0?b.slideWidth*Math.floor(b.options.slidesToShow/2):0,b.options.swipeToSlide===!0?(b.$slideTrack.find(".slick-slide").each(function(c,f){return f.offsetLeft-e+a(f).outerWidth()/2>-1*b.swipeLeft?(d=f,!1):void 0}),c=Math.abs(a(d).attr("data-slick-index")-b.currentSlide)||1):b.options.slidesToScroll},b.prototype.goTo=b.prototype.slickGoTo=function(a,b){var c=this;c.changeSlide({data:{message:"index",index:parseInt(a)}},b)},b.prototype.init=function(b){var c=this;a(c.$slider).hasClass("slick-initialized")||(a(c.$slider).addClass("slick-initialized"),c.buildRows(),c.buildOut(),c.setProps(),c.startLoad(),c.loadSlider(),c.initializeEvents(),c.updateArrows(),c.updateDots()),b&&c.$slider.trigger("init",[c]),c.options.accessibility===!0&&c.initADA()},b.prototype.initArrowEvents=function(){var a=this;a.options.arrows===!0&&a.slideCount>a.options.slidesToShow&&(a.$prevArrow.on("click.slick",{message:"previous"},a.changeSlide),a.$nextArrow.on("click.slick",{message:"next"},a.changeSlide))},b.prototype.initDotEvents=function(){var b=this;b.options.dots===!0&&b.slideCount>b.options.slidesToShow&&a("li",b.$dots).on("click.slick",{message:"index"},b.changeSlide),b.options.dots===!0&&b.options.pauseOnDotsHover===!0&&b.options.autoplay===!0&&a("li",b.$dots).on("mouseenter.slick",a.proxy(b.setPaused,b,!0)).on("mouseleave.slick",a.proxy(b.setPaused,b,!1))},b.prototype.initializeEvents=function(){var b=this;b.initArrowEvents(),b.initDotEvents(),b.$list.on("touchstart.slick mousedown.slick",{action:"start"},b.swipeHandler),b.$list.on("touchmove.slick mousemove.slick",{action:"move"},b.swipeHandler),b.$list.on("touchend.slick mouseup.slick",{action:"end"},b.swipeHandler),b.$list.on("touchcancel.slick mouseleave.slick",{action:"end"},b.swipeHandler),b.$list.on("click.slick",b.clickHandler),a(document).on(b.visibilityChange,a.proxy(b.visibility,b)),b.$list.on("mouseenter.slick",a.proxy(b.setPaused,b,!0)),b.$list.on("mouseleave.slick",a.proxy(b.setPaused,b,!1)),b.options.accessibility===!0&&b.$list.on("keydown.slick",b.keyHandler),b.options.focusOnSelect===!0&&a(b.$slideTrack).children().on("click.slick",b.selectHandler),a(window).on("orientationchange.slick.slick-"+b.instanceUid,a.proxy(b.orientationChange,b)),a(window).on("resize.slick.slick-"+b.instanceUid,a.proxy(b.resize,b)),a("[draggable!=true]",b.$slideTrack).on("dragstart",b.preventDefault),a(window).on("load.slick.slick-"+b.instanceUid,b.setPosition),a(document).on("ready.slick.slick-"+b.instanceUid,b.setPosition)},b.prototype.initUI=function(){var a=this;a.options.arrows===!0&&a.slideCount>a.options.slidesToShow&&(a.$prevArrow.show(),a.$nextArrow.show()),a.options.dots===!0&&a.slideCount>a.options.slidesToShow&&a.$dots.show(),a.options.autoplay===!0&&a.autoPlay()},b.prototype.keyHandler=function(a){var b=this;a.target.tagName.match("TEXTAREA|INPUT|SELECT")||(37===a.keyCode&&b.options.accessibility===!0?b.changeSlide({data:{message:"previous"}}):39===a.keyCode&&b.options.accessibility===!0&&b.changeSlide({data:{message:"next"}}))},b.prototype.lazyLoad=function(){function g(b){a("img[data-lazy]",b).each(function(){var b=a(this),c=a(this).attr("data-lazy"),d=document.createElement("img");d.onload=function(){b.animate({opacity:0},100,function(){b.attr("src",c).animate({opacity:1},200,function(){b.removeAttr("data-lazy").removeClass("slick-loading")})})},d.src=c})}var c,d,e,f,b=this;b.options.centerMode===!0?b.options.infinite===!0?(e=b.currentSlide+(b.options.slidesToShow/2+1),f=e+b.options.slidesToShow+2):(e=Math.max(0,b.currentSlide-(b.options.slidesToShow/2+1)),f=2+(b.options.slidesToShow/2+1)+b.currentSlide):(e=b.options.infinite?b.options.slidesToShow+b.currentSlide:b.currentSlide,f=e+b.options.slidesToShow,b.options.fade===!0&&(e>0&&e--,f<=b.slideCount&&f++)),c=b.$slider.find(".slick-slide").slice(e,f),g(c),b.slideCount<=b.options.slidesToShow?(d=b.$slider.find(".slick-slide"),g(d)):b.currentSlide>=b.slideCount-b.options.slidesToShow?(d=b.$slider.find(".slick-cloned").slice(0,b.options.slidesToShow),g(d)):0===b.currentSlide&&(d=b.$slider.find(".slick-cloned").slice(-1*b.options.slidesToShow),g(d))},b.prototype.loadSlider=function(){var a=this;a.setPosition(),a.$slideTrack.css({opacity:1}),a.$slider.removeClass("slick-loading"),a.initUI(),"progressive"===a.options.lazyLoad&&a.progressiveLazyLoad()},b.prototype.next=b.prototype.slickNext=function(){var a=this;a.changeSlide({data:{message:"next"}})},b.prototype.orientationChange=function(){var a=this;a.checkResponsive(),a.setPosition()},b.prototype.pause=b.prototype.slickPause=function(){var a=this;a.autoPlayClear(),a.paused=!0},b.prototype.play=b.prototype.slickPlay=function(){var a=this;a.paused=!1,a.autoPlay()},b.prototype.postSlide=function(a){var b=this;b.$slider.trigger("afterChange",[b,a]),b.animating=!1,b.setPosition(),b.swipeLeft=null,b.options.autoplay===!0&&b.paused===!1&&b.autoPlay(),b.options.accessibility===!0&&b.initADA()},b.prototype.prev=b.prototype.slickPrev=function(){var a=this;a.changeSlide({data:{message:"previous"}})},b.prototype.preventDefault=function(a){a.preventDefault()},b.prototype.progressiveLazyLoad=function(){var c,d,b=this;c=a("img[data-lazy]",b.$slider).length,c>0&&(d=a("img[data-lazy]",b.$slider).first(),d.attr("src",null),d.attr("src",d.attr("data-lazy")).removeClass("slick-loading").load(function(){d.removeAttr("data-lazy"),b.progressiveLazyLoad(),b.options.adaptiveHeight===!0&&b.setPosition()}).error(function(){d.removeAttr("data-lazy"),b.progressiveLazyLoad()}))},b.prototype.refresh=function(b){var d,e,c=this;e=c.slideCount-c.options.slidesToShow,c.options.infinite||(c.slideCount<=c.options.slidesToShow?c.currentSlide=0:c.currentSlide>e&&(c.currentSlide=e)),d=c.currentSlide,c.destroy(!0),a.extend(c,c.initials,{currentSlide:d}),c.init(),b||c.changeSlide({data:{message:"index",index:d}},!1)},b.prototype.registerBreakpoints=function(){var c,d,e,b=this,f=b.options.responsive||null;if("array"===a.type(f)&&f.length){b.respondTo=b.options.respondTo||"window";for(c in f)if(e=b.breakpoints.length-1,d=f[c].breakpoint,f.hasOwnProperty(c)){for(;e>=0;)b.breakpoints[e]&&b.breakpoints[e]===d&&b.breakpoints.splice(e,1),e--;b.breakpoints.push(d),b.breakpointSettings[d]=f[c].settings}b.breakpoints.sort(function(a,c){return b.options.mobileFirst?a-c:c-a})}},b.prototype.reinit=function(){var b=this;b.$slides=b.$slideTrack.children(b.options.slide).addClass("slick-slide"),b.slideCount=b.$slides.length,b.currentSlide>=b.slideCount&&0!==b.currentSlide&&(b.currentSlide=b.currentSlide-b.options.slidesToScroll),b.slideCount<=b.options.slidesToShow&&(b.currentSlide=0),b.registerBreakpoints(),b.setProps(),b.setupInfinite(),b.buildArrows(),b.updateArrows(),b.initArrowEvents(),b.buildDots(),b.updateDots(),b.initDotEvents(),b.checkResponsive(!1,!0),b.options.focusOnSelect===!0&&a(b.$slideTrack).children().on("click.slick",b.selectHandler),b.setSlideClasses(0),b.setPosition(),b.$slider.trigger("reInit",[b]),b.options.autoplay===!0&&b.focusHandler()},b.prototype.resize=function(){var b=this;a(window).width()!==b.windowWidth&&(clearTimeout(b.windowDelay),b.windowDelay=window.setTimeout(function(){b.windowWidth=a(window).width(),b.checkResponsive(),b.unslicked||b.setPosition()},50))},b.prototype.removeSlide=b.prototype.slickRemove=function(a,b,c){var d=this;return"boolean"==typeof a?(b=a,a=b===!0?0:d.slideCount-1):a=b===!0?--a:a,d.slideCount<1||0>a||a>d.slideCount-1?!1:(d.unload(),c===!0?d.$slideTrack.children().remove():d.$slideTrack.children(this.options.slide).eq(a).remove(),d.$slides=d.$slideTrack.children(this.options.slide),d.$slideTrack.children(this.options.slide).detach(),d.$slideTrack.append(d.$slides),d.$slidesCache=d.$slides,void d.reinit())},b.prototype.setCSS=function(a){var d,e,b=this,c={};b.options.rtl===!0&&(a=-a),d="left"==b.positionProp?Math.ceil(a)+"px":"0px",e="top"==b.positionProp?Math.ceil(a)+"px":"0px",c[b.positionProp]=a,b.transformsEnabled===!1?b.$slideTrack.css(c):(c={},b.cssTransitions===!1?(c[b.animType]="translate("+d+", "+e+")",b.$slideTrack.css(c)):(c[b.animType]="translate3d("+d+", "+e+", 0px)",b.$slideTrack.css(c)))},b.prototype.setDimensions=function(){var a=this;a.options.vertical===!1?a.options.centerMode===!0&&a.$list.css({padding:"0px "+a.options.centerPadding}):(a.$list.height(a.$slides.first().outerHeight(!0)*a.options.slidesToShow),a.options.centerMode===!0&&a.$list.css({padding:a.options.centerPadding+" 0px"})),a.listWidth=a.$list.width(),a.listHeight=a.$list.height(),a.options.vertical===!1&&a.options.variableWidth===!1?(a.slideWidth=Math.ceil(a.listWidth/a.options.slidesToShow),a.$slideTrack.width(Math.ceil(a.slideWidth*a.$slideTrack.children(".slick-slide").length))):a.options.variableWidth===!0?a.$slideTrack.width(5e3*a.slideCount):(a.slideWidth=Math.ceil(a.listWidth),a.$slideTrack.height(Math.ceil(a.$slides.first().outerHeight(!0)*a.$slideTrack.children(".slick-slide").length)));var b=a.$slides.first().outerWidth(!0)-a.$slides.first().width();a.options.variableWidth===!1&&a.$slideTrack.children(".slick-slide").width(a.slideWidth-b)},b.prototype.setFade=function(){var c,b=this;b.$slides.each(function(d,e){c=b.slideWidth*d*-1,b.options.rtl===!0?a(e).css({position:"relative",right:c,top:0,zIndex:b.options.zIndex-2,opacity:0}):a(e).css({position:"relative",left:c,top:0,zIndex:b.options.zIndex-2,opacity:0})}),b.$slides.eq(b.currentSlide).css({zIndex:b.options.zIndex-1,opacity:1})},b.prototype.setHeight=function(){var a=this;if(1===a.options.slidesToShow&&a.options.adaptiveHeight===!0&&a.options.vertical===!1){var b=a.$slides.eq(a.currentSlide).outerHeight(!0);a.$list.css("height",b)}},b.prototype.setOption=b.prototype.slickSetOption=function(b,c,d){var f,g,e=this;if("responsive"===b&&"array"===a.type(c))for(g in c)if("array"!==a.type(e.options.responsive))e.options.responsive=[c[g]];else{for(f=e.options.responsive.length-1;f>=0;)e.options.responsive[f].breakpoint===c[g].breakpoint&&e.options.responsive.splice(f,1),f--;e.options.responsive.push(c[g])}else e.options[b]=c;d===!0&&(e.unload(),e.reinit())},b.prototype.setPosition=function(){var a=this;a.setDimensions(),a.setHeight(),a.options.fade===!1?a.setCSS(a.getLeft(a.currentSlide)):a.setFade(),a.$slider.trigger("setPosition",[a])},b.prototype.setProps=function(){var a=this,b=document.body.style;a.positionProp=a.options.vertical===!0?"top":"left","top"===a.positionProp?a.$slider.addClass("slick-vertical"):a.$slider.removeClass("slick-vertical"),(void 0!==b.WebkitTransition||void 0!==b.MozTransition||void 0!==b.msTransition)&&a.options.useCSS===!0&&(a.cssTransitions=!0),a.options.fade&&("number"==typeof a.options.zIndex?a.options.zIndex<3&&(a.options.zIndex=3):a.options.zIndex=a.defaults.zIndex),void 0!==b.OTransform&&(a.animType="OTransform",a.transformType="-o-transform",a.transitionType="OTransition",void 0===b.perspectiveProperty&&void 0===b.webkitPerspective&&(a.animType=!1)),void 0!==b.MozTransform&&(a.animType="MozTransform",a.transformType="-moz-transform",a.transitionType="MozTransition",void 0===b.perspectiveProperty&&void 0===b.MozPerspective&&(a.animType=!1)),void 0!==b.webkitTransform&&(a.animType="webkitTransform",a.transformType="-webkit-transform",a.transitionType="webkitTransition",void 0===b.perspectiveProperty&&void 0===b.webkitPerspective&&(a.animType=!1)),void 0!==b.msTransform&&(a.animType="msTransform",a.transformType="-ms-transform",a.transitionType="msTransition",void 0===b.msTransform&&(a.animType=!1)),void 0!==b.transform&&a.animType!==!1&&(a.animType="transform",a.transformType="transform",a.transitionType="transition"),a.transformsEnabled=a.options.useTransform&&null!==a.animType&&a.animType!==!1},b.prototype.setSlideClasses=function(a){var c,d,e,f,b=this;d=b.$slider.find(".slick-slide").removeClass("slick-active slick-center slick-current").attr("aria-hidden","true"),b.$slides.eq(a).addClass("slick-current"),b.options.centerMode===!0?(c=Math.floor(b.options.slidesToShow/2),b.options.infinite===!0&&(a>=c&&a<=b.slideCount-1-c?b.$slides.slice(a-c,a+c+1).addClass("slick-active").attr("aria-hidden","false"):(e=b.options.slidesToShow+a,d.slice(e-c+1,e+c+2).addClass("slick-active").attr("aria-hidden","false")),0===a?d.eq(d.length-1-b.options.slidesToShow).addClass("slick-center"):a===b.slideCount-1&&d.eq(b.options.slidesToShow).addClass("slick-center")),b.$slides.eq(a).addClass("slick-center")):a>=0&&a<=b.slideCount-b.options.slidesToShow?b.$slides.slice(a,a+b.options.slidesToShow).addClass("slick-active").attr("aria-hidden","false"):d.length<=b.options.slidesToShow?d.addClass("slick-active").attr("aria-hidden","false"):(f=b.slideCount%b.options.slidesToShow,e=b.options.infinite===!0?b.options.slidesToShow+a:a,b.options.slidesToShow==b.options.slidesToScroll&&b.slideCount-a<b.options.slidesToShow?d.slice(e-(b.options.slidesToShow-f),e+f).addClass("slick-active").attr("aria-hidden","false"):d.slice(e,e+b.options.slidesToShow).addClass("slick-active").attr("aria-hidden","false")),"ondemand"===b.options.lazyLoad&&b.lazyLoad()},b.prototype.setupInfinite=function(){var c,d,e,b=this;if(b.options.fade===!0&&(b.options.centerMode=!1),b.options.infinite===!0&&b.options.fade===!1&&(d=null,b.slideCount>b.options.slidesToShow)){for(e=b.options.centerMode===!0?b.options.slidesToShow+1:b.options.slidesToShow,c=b.slideCount;c>b.slideCount-e;c-=1)d=c-1,a(b.$slides[d]).clone(!0).attr("id","").attr("data-slick-index",d-b.slideCount).prependTo(b.$slideTrack).addClass("slick-cloned");for(c=0;e>c;c+=1)d=c,a(b.$slides[d]).clone(!0).attr("id","").attr("data-slick-index",d+b.slideCount).appendTo(b.$slideTrack).addClass("slick-cloned");b.$slideTrack.find(".slick-cloned").find("[id]").each(function(){a(this).attr("id","")})}},b.prototype.setPaused=function(a){var b=this;b.options.autoplay===!0&&b.options.pauseOnHover===!0&&(b.paused=a,a?b.autoPlayClear():b.autoPlay())},b.prototype.selectHandler=function(b){var c=this,d=a(b.target).is(".slick-slide")?a(b.target):a(b.target).parents(".slick-slide"),e=parseInt(d.attr("data-slick-index"));return e||(e=0),c.slideCount<=c.options.slidesToShow?(c.setSlideClasses(e),void c.asNavFor(e)):void c.slideHandler(e)},b.prototype.slideHandler=function(a,b,c){var d,e,f,g,h=null,i=this;return b=b||!1,i.animating===!0&&i.options.waitForAnimate===!0||i.options.fade===!0&&i.currentSlide===a||i.slideCount<=i.options.slidesToShow?void 0:(b===!1&&i.asNavFor(a),d=a,h=i.getLeft(d),g=i.getLeft(i.currentSlide),i.currentLeft=null===i.swipeLeft?g:i.swipeLeft,i.options.infinite===!1&&i.options.centerMode===!1&&(0>a||a>i.getDotCount()*i.options.slidesToScroll)?void(i.options.fade===!1&&(d=i.currentSlide,c!==!0?i.animateSlide(g,function(){i.postSlide(d);
}):i.postSlide(d))):i.options.infinite===!1&&i.options.centerMode===!0&&(0>a||a>i.slideCount-i.options.slidesToScroll)?void(i.options.fade===!1&&(d=i.currentSlide,c!==!0?i.animateSlide(g,function(){i.postSlide(d)}):i.postSlide(d))):(i.options.autoplay===!0&&clearInterval(i.autoPlayTimer),e=0>d?i.slideCount%i.options.slidesToScroll!==0?i.slideCount-i.slideCount%i.options.slidesToScroll:i.slideCount+d:d>=i.slideCount?i.slideCount%i.options.slidesToScroll!==0?0:d-i.slideCount:d,i.animating=!0,i.$slider.trigger("beforeChange",[i,i.currentSlide,e]),f=i.currentSlide,i.currentSlide=e,i.setSlideClasses(i.currentSlide),i.updateDots(),i.updateArrows(),i.options.fade===!0?(c!==!0?(i.fadeSlideOut(f),i.fadeSlide(e,function(){i.postSlide(e)})):i.postSlide(e),void i.animateHeight()):void(c!==!0?i.animateSlide(h,function(){i.postSlide(e)}):i.postSlide(e))))},b.prototype.startLoad=function(){var a=this;a.options.arrows===!0&&a.slideCount>a.options.slidesToShow&&(a.$prevArrow.hide(),a.$nextArrow.hide()),a.options.dots===!0&&a.slideCount>a.options.slidesToShow&&a.$dots.hide(),a.$slider.addClass("slick-loading")},b.prototype.swipeDirection=function(){var a,b,c,d,e=this;return a=e.touchObject.startX-e.touchObject.curX,b=e.touchObject.startY-e.touchObject.curY,c=Math.atan2(b,a),d=Math.round(180*c/Math.PI),0>d&&(d=360-Math.abs(d)),45>=d&&d>=0?e.options.rtl===!1?"left":"right":360>=d&&d>=315?e.options.rtl===!1?"left":"right":d>=135&&225>=d?e.options.rtl===!1?"right":"left":e.options.verticalSwiping===!0?d>=35&&135>=d?"left":"right":"vertical"},b.prototype.swipeEnd=function(a){var c,b=this;if(b.dragging=!1,b.shouldClick=b.touchObject.swipeLength>10?!1:!0,void 0===b.touchObject.curX)return!1;if(b.touchObject.edgeHit===!0&&b.$slider.trigger("edge",[b,b.swipeDirection()]),b.touchObject.swipeLength>=b.touchObject.minSwipe)switch(b.swipeDirection()){case"left":c=b.options.swipeToSlide?b.checkNavigable(b.currentSlide+b.getSlideCount()):b.currentSlide+b.getSlideCount(),b.slideHandler(c),b.currentDirection=0,b.touchObject={},b.$slider.trigger("swipe",[b,"left"]);break;case"right":c=b.options.swipeToSlide?b.checkNavigable(b.currentSlide-b.getSlideCount()):b.currentSlide-b.getSlideCount(),b.slideHandler(c),b.currentDirection=1,b.touchObject={},b.$slider.trigger("swipe",[b,"right"])}else b.touchObject.startX!==b.touchObject.curX&&(b.slideHandler(b.currentSlide),b.touchObject={})},b.prototype.swipeHandler=function(a){var b=this;if(!(b.options.swipe===!1||"ontouchend"in document&&b.options.swipe===!1||b.options.draggable===!1&&-1!==a.type.indexOf("mouse")))switch(b.touchObject.fingerCount=a.originalEvent&&void 0!==a.originalEvent.touches?a.originalEvent.touches.length:1,b.touchObject.minSwipe=b.listWidth/b.options.touchThreshold,b.options.verticalSwiping===!0&&(b.touchObject.minSwipe=b.listHeight/b.options.touchThreshold),a.data.action){case"start":b.swipeStart(a);break;case"move":b.swipeMove(a);break;case"end":b.swipeEnd(a)}},b.prototype.swipeMove=function(a){var d,e,f,g,h,b=this;return h=void 0!==a.originalEvent?a.originalEvent.touches:null,!b.dragging||h&&1!==h.length?!1:(d=b.getLeft(b.currentSlide),b.touchObject.curX=void 0!==h?h[0].pageX:a.clientX,b.touchObject.curY=void 0!==h?h[0].pageY:a.clientY,b.touchObject.swipeLength=Math.round(Math.sqrt(Math.pow(b.touchObject.curX-b.touchObject.startX,2))),b.options.verticalSwiping===!0&&(b.touchObject.swipeLength=Math.round(Math.sqrt(Math.pow(b.touchObject.curY-b.touchObject.startY,2)))),e=b.swipeDirection(),"vertical"!==e?(void 0!==a.originalEvent&&b.touchObject.swipeLength>4&&a.preventDefault(),g=(b.options.rtl===!1?1:-1)*(b.touchObject.curX>b.touchObject.startX?1:-1),b.options.verticalSwiping===!0&&(g=b.touchObject.curY>b.touchObject.startY?1:-1),f=b.touchObject.swipeLength,b.touchObject.edgeHit=!1,b.options.infinite===!1&&(0===b.currentSlide&&"right"===e||b.currentSlide>=b.getDotCount()&&"left"===e)&&(f=b.touchObject.swipeLength*b.options.edgeFriction,b.touchObject.edgeHit=!0),b.options.vertical===!1?b.swipeLeft=d+f*g:b.swipeLeft=d+f*(b.$list.height()/b.listWidth)*g,b.options.verticalSwiping===!0&&(b.swipeLeft=d+f*g),b.options.fade===!0||b.options.touchMove===!1?!1:b.animating===!0?(b.swipeLeft=null,!1):void b.setCSS(b.swipeLeft)):void 0)},b.prototype.swipeStart=function(a){var c,b=this;return 1!==b.touchObject.fingerCount||b.slideCount<=b.options.slidesToShow?(b.touchObject={},!1):(void 0!==a.originalEvent&&void 0!==a.originalEvent.touches&&(c=a.originalEvent.touches[0]),b.touchObject.startX=b.touchObject.curX=void 0!==c?c.pageX:a.clientX,b.touchObject.startY=b.touchObject.curY=void 0!==c?c.pageY:a.clientY,void(b.dragging=!0))},b.prototype.unfilterSlides=b.prototype.slickUnfilter=function(){var a=this;null!==a.$slidesCache&&(a.unload(),a.$slideTrack.children(this.options.slide).detach(),a.$slidesCache.appendTo(a.$slideTrack),a.reinit())},b.prototype.unload=function(){var b=this;a(".slick-cloned",b.$slider).remove(),b.$dots&&b.$dots.remove(),b.$prevArrow&&b.htmlExpr.test(b.options.prevArrow)&&b.$prevArrow.remove(),b.$nextArrow&&b.htmlExpr.test(b.options.nextArrow)&&b.$nextArrow.remove(),b.$slides.removeClass("slick-slide slick-active slick-visible slick-current").attr("aria-hidden","true").css("width","")},b.prototype.unslick=function(a){var b=this;b.$slider.trigger("unslick",[b,a]),b.destroy()},b.prototype.updateArrows=function(){var b,a=this;b=Math.floor(a.options.slidesToShow/2),a.options.arrows===!0&&a.slideCount>a.options.slidesToShow&&!a.options.infinite&&(a.$prevArrow.removeClass("slick-disabled").attr("aria-disabled","false"),a.$nextArrow.removeClass("slick-disabled").attr("aria-disabled","false"),0===a.currentSlide?(a.$prevArrow.addClass("slick-disabled").attr("aria-disabled","true"),a.$nextArrow.removeClass("slick-disabled").attr("aria-disabled","false")):a.currentSlide>=a.slideCount-a.options.slidesToShow&&a.options.centerMode===!1?(a.$nextArrow.addClass("slick-disabled").attr("aria-disabled","true"),a.$prevArrow.removeClass("slick-disabled").attr("aria-disabled","false")):a.currentSlide>=a.slideCount-1&&a.options.centerMode===!0&&(a.$nextArrow.addClass("slick-disabled").attr("aria-disabled","true"),a.$prevArrow.removeClass("slick-disabled").attr("aria-disabled","false")))},b.prototype.updateDots=function(){var a=this;null!==a.$dots&&(a.$dots.find("li").removeClass("slick-active").attr("aria-hidden","true"),a.$dots.find("li").eq(Math.floor(a.currentSlide/a.options.slidesToScroll)).addClass("slick-active").attr("aria-hidden","false"))},b.prototype.visibility=function(){var a=this;document[a.hidden]?(a.paused=!0,a.autoPlayClear()):a.options.autoplay===!0&&(a.paused=!1,a.autoPlay())},b.prototype.initADA=function(){var b=this;b.$slides.add(b.$slideTrack.find(".slick-cloned")).attr({"aria-hidden":"true",tabindex:"-1"}).find("a, input, button, select").attr({tabindex:"-1"}),b.$slideTrack.attr("role","listbox"),b.$slides.not(b.$slideTrack.find(".slick-cloned")).each(function(c){a(this).attr({role:"option","aria-describedby":"slick-slide"+b.instanceUid+c})}),null!==b.$dots&&b.$dots.attr("role","tablist").find("li").each(function(c){a(this).attr({role:"presentation","aria-selected":"false","aria-controls":"navigation"+b.instanceUid+c,id:"slick-slide"+b.instanceUid+c})}).first().attr("aria-selected","true").end().find("button").attr("role","button").end().closest("div").attr("role","toolbar"),b.activateADA()},b.prototype.activateADA=function(){var a=this;a.$slideTrack.find(".slick-active").attr({"aria-hidden":"false"}).find("a, input, button, select").attr({tabindex:"0"})},b.prototype.focusHandler=function(){var b=this;b.$slider.on("focus.slick blur.slick","*",function(c){c.stopImmediatePropagation();var d=a(this);setTimeout(function(){b.isPlay&&(d.is(":focus")?(b.autoPlayClear(),b.paused=!0):(b.paused=!1,b.autoPlay()))},0)})},a.fn.slick=function(){var f,g,a=this,c=arguments[0],d=Array.prototype.slice.call(arguments,1),e=a.length;for(f=0;e>f;f++)if("object"==typeof c||"undefined"==typeof c?a[f].slick=new b(a[f],c):g=a[f].slick[c].apply(a[f].slick,d),"undefined"!=typeof g)return g;return a}});
// Testando app js

$(document).ready(function() {
    (function($) {
        // Main Menu
        $('.nav-item').on({click: function( event ) {
            if (this.href == "#") {
                event.preventDefault();
            }
            // $(this).find('.nav-sub').toggle("slow", "linear");
            $(this).find('.nav-sub').animate({
                opacity: 'show'
            }, 'fast');
        }, mouseenter: function() {
            $(this).find('.nav-sub').animate({
                opacity: 'show'
            }, 'fast');
        }, mouseleave: function() {
            $(this).find('.nav-sub').animate({
                opacity: 'hide'
            }, 'fast');
        }
        });

        // Mobile Menu
        // $('.main-nav-menu').click(function() {
        //     // event.preventDefault();
        //     $(this).next('.main-nav-list').toggle();

        // });
        $('.main-nav-menu').on("click", function( event ) {
            event.preventDefault();
            var nav = $(this).next('.main-nav-list');
            nav.toggle();
            $(".main-nav").on("mouseleave", function() {
                nav.slideUp("slow");
            });
        });

        $(window).resize(function(){
            var nav = $('.main-nav-list');
            if ($('.main-wrapper').width() > 969 ){
                console.log('maior 970');
                nav.show();
                $(".main-nav").off("mouseleave");
            } else {
                nav.hide();
            }
        });

        // Active Menu 
        // var pgurl = window.location.href.substr(window.location.href.lastIndexOf("/")+1);
        // $(".main-nav-list .nav-link").each(function(){
        //     console.log('pgurl= ' + pgurl);
        //     console.log('href= ' + $(this).attr("href"));
        //     if($(this).attr("href") == pgurl || $(this).attr("href") == '' )
        //         $(this).addClass("nav-link--active");
        // })

        // Slides config
        // 
        // 
        $('[id$="slide-list"]').each(function(i, obj) {
            $(this).slick({
                dots: $(this).data("slide-dots"),
                arrows: false,
                speed: 300,
                adaptiveHeight: $(this).data("slide-adapHeight"),
                autoplay: $(this).data("slide-autoplay"),
                autoplaySpeed: 5000,
                // vertical: $(this).data("slide-vertical"),
                slidesToShow: $(this).data("slide-num"),
                slidesToScroll: $(this).data("slide-num"),
                responsive: [
                    {
                        breakpoint: 667,
                        settings: {
                            slidesToShow: ($(this).data("slide-responsive")) ? $(this).data("slide-responsive") : 1,
                            slidesToScroll: ($(this).data("slide-responsive")) ? $(this).data("slide-responsive") : 1,
                            centerMode: $(this).data("slide-center"),
                            variableWidth: $(this).data("slide-center")
                        }
                    }
                ]
            });
        });
        
        /*
        $('#banner-slide-list').slick({
            dots: false,
            arrows: false,
            speed: 300,
            slidesToShow: 1,
            slidesToScroll: 1
        });

        $('#foto-slide-list').slick({
            dots: false,
            arrows: false,
            // infinite: false,
            speed: 300,
            slidesToShow: 4,
            slidesToScroll: 4,
            // centerMode: true,
            responsive: [
                // {
                //     breakpoint: 667,
                //     settings: {
                //         slidesToShow: 2,
                //         slidesToScroll: 2
                //         // centerMode: true,
                //         // variableWidth: true,
                //         // slidesToShow: 3,
                //         // slidesToScroll: 3
                //     }
                // },
                {
                    breakpoint: 667,
                    settings: {
                        slidesToShow: 1,
                        slidesToScroll: 1,
                        // centerMode: true,
                    }
                }
                // You can unslick at a given breakpoint now by adding:
                // settings: "unslick"
                // instead of a settings object
            ]
        });

        $('#portifolio-slide-list').slick({
            dots: false,
            arrows: false,
            speed: 300,
            slidesToShow: 3,
            slidesToScroll: 3,
            responsive: [
                {
                    breakpoint: 667,
                    settings: {
                        centerMode: true,
                        variableWidth: true
                    }
                }
            ]
        });

        $('#service-slide-list').slick({
            dots: false,
            arrows: false,
            speed: 300,
            slidesToShow: 3,
            slidesToScroll: 3,
            responsive: [
                {
                    breakpoint: 667,
                    settings: {
                        slidesToShow: 1,
                        slidesToScroll: 1
                    }
                }
            ]
        });

        $('#clients-slide-list').slick({
            dots: false,
            arrows: false,
            speed: 300,
            slidesToShow: 4,
            slidesToScroll: 4,
            responsive: [
                {
                    breakpoint: 667,
                    settings: {
                        centerMode: true,
                        variableWidth: true
                    }
                }
            ]
        });

        $('#testimonial-slide-list').slick({
            dots: true,
            arrows: false,
            vertical: true,
            easing: 'linear',
            // infinite: false,
            speed: 300,
            slidesToShow: 1,
            slidesToScroll: 1,
        });
*/
        
        // Slide nav next and prev envent
        var getId = function(element) {
            return '#' + $(element).parent().prev().attr('id');
        };
        $('.custom-nav-left').click(function(event) {
            event.preventDefault();
            $(getId(this)).slick('slickPrev');
        });
        $('.custom-nav-right').click(function(event) {
            event.preventDefault();
            $(getId(this)).slick('slickNext');
        });

        // Slide show next and prev
        // $('.bl-article, #slide-banner').hover(function() {
        //     var $liTotal = $(this).find('li.slick-slide').length;
        //     var $liActive = $(this).find('li.slick-active').length;
        //     console.log($liTotal);
        //     console.log($liActive);
            
        //     if ( $liTotal > $liActive ) {
        //         $(this).children('.custom-nav-wrapper').animate({
        //             opacity: 'show'
        //         }, 'slow');
        //     };
        // }, function() {
        //     $(this).children('.custom-nav-wrapper').animate({
        //         opacity: 'hide'
        //     }, 'fast');
        // });
        
        // var banner = $(".banner-block");
        // var $liTotal = banner.find('li.slick-slide').length;
        // var $liActive = banner.find('li.slick-active').length;
        // if( $liTotal <= $liActive ) banner.find('.custom-nav-wrapper').hide();

        $('.bl-article, .banner-block').on("mouseenter mouseleave touchstart", function() {
            console.log(this);
            var $liTotal = $(this).find('li.slick-slide').length;
            var $liActive = $(this).find('li.slick-active').length;
            console.log($liTotal);
            console.log($liActive);
            // if( $liTotal <= $liActive ) $(".banner-block").hide();
            if ( $liTotal > $liActive && $(this).hasClass('bl-article')) $(this).find('.custom-nav-wrapper').fadeToggle("slow");
        });

        // Scroll Top
        $('#scroll-top-btn').click(function(event) {
            event.preventDefault();
            alert( "Handler for .click() called." );
            console.log('top');
            // var target = $(this.href);
            // console.log(target);
            // if( target.length ) {
            //     event.preventDefault();
            //     $('html, body').animate({
            //         scrollTop: target.offset().top
            //     }, 9000);
            // }
        });

        // Lightbox

        lightbox.option({
            'alwaysShowNavOnTouchDevices': true,
            'albumLabel': "Quem Somos - Galeria de Imagens",
            'disableScrolling': true,
            'positionFromTop': 80
        });

        // var $messages = $('#error-message-wrappers');

        $.validate({
            form : '#contact-form',
            modules : 'brazil',
            borderColorOnError : '#C60000',
            scrollToTopOnError: 'false',
            inputParentClassOnSuccess: 'false',
            
            onElementValidate : function(valid, $el, $form, errorMess) {
                if(!valid) {
                    $($el.context).prev().remove();
                    $($el.context).after('<span class="help-block form-error">'+ errorMess +'</span>');
                }
            },

            onSuccess : function($form) {

                var formMessages = $('#email-message'),
                    form = $form,
                    formData = $(form).serialize();
                $.ajax({
                    type: 'POST',
                    url: '//formspree.io/brandel.rj@gmail.com',
                    data: formData,
                    dataType: "json"
                }).done(function(response) {
                    // console.log("done");
                    // Make sure that the formMessages div has the 'success' class.
                    formMessages.removeClass('form-error');
                    formMessages.addClass('form-success');
                    // Set the message text.
                    formMessages.text('Formulário enviado com sucesso').fadeIn("slow").fadeOut(6000);
                    // Clear the form.
                    $('#form-name').val('');
                    $('#form-email').val('');
                    $('#form-tel').val('');
                    $('#form-msg').val('');
                }).fail(function(data) {
                    // console.log("fail");
                    formMessages.removeClass('form-success');
                    formMessages.addClass('form-error');
                    formMessages.text('Ocorreu um erro, tente novamente.').fadeIn("slow").fadeOut(6000);
                    
                });

                return false;
            }
        });

        // Restrict presentation length

        $('#form-msg').restrictLength( $('#maxlength') );

        // using jQuery Mask Plugin v1.7.5
        // http://jsfiddle.net/d29m6enx/2/

        var maskBehavior = function (val) {
            return val.replace(/\D/g, '').length === 11 ? '(00) 00000-0000' : '(00) 0000-00009';
        },
        options = {onKeyPress: function(val, e, field, options) {
            field.mask(maskBehavior.apply({}, arguments), options);
            }
        };
        $('#form-tel').mask(maskBehavior, options);

        // Google Maps
        
        $.fn.gMaps = function( options ) {
        
            var settings = $.extend({
                address: "Rua Senador Souza Naves, 771, Londrina, PR",
                zoom: 14,
                pin: "images/map-pin.png",
                info: false,
                scroll: false
            }, options );

            var $el = $(this)[0];

            mapAddress($el, settings);

            return this
        
        };

        function mapAddress(mapElement, settings) {
            var geocoder = new google.maps.Geocoder();

            geocoder.geocode({ 'address': settings.address }, function (results, status) {
                if (status == google.maps.GeocoderStatus.OK) {
                    var mapOptions = {
                        zoom: settings.zoom,
                        center: results[0].geometry.location,
                        scrollwheel: settings.scroll ? true : false
                    };
                    var map = new google.maps.Map(mapElement, mapOptions);
                    var marker = new google.maps.Marker({
                        map: map,
                        position: results[0].geometry.location,
                        icon: settings.pin
                    });

                    if(settings.info) {
                        var contentString = '<div class="map-marker">Consultório Ricardo Brandão: ' + 
                                            '<span>Rua Senador Souza Naves, 771, Sala 305 - Londrina-PR</span></div>';
                        var infowindow = new google.maps.InfoWindow({
                            content: contentString
                        });
                        infowindow.open(map, marker);
                        marker.addListener('click', function() {
                            infowindow.open(map, marker);
                        });
                    }
                    
                } else {
                    console.log("Geocode was not successful for the following reason: " + status);
                }
            });
        }

        $("#gmap-sd").gMaps();
        $("#gmap-lc").gMaps({ zoom: 16, pin: "images/map-pin-big.png", info: true });

    })(jQuery);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImpxdWVyeS5tYXNrLmpzIiwianF1ZXJ5LmZvcm0tdmFsaWRhdG9yLmpzIiwiYnJhemlsLmpzIiwibGlnaHRib3guanMiLCJzbGljay5qcyIsIm1haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN6ZUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDeHZEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbkhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDcmNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImFsbC5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICoganF1ZXJ5Lm1hc2suanNcbiAqIEB2ZXJzaW9uOiB2MS4xMy40XG4gKiBAYXV0aG9yOiBJZ29yIEVzY29iYXJcbiAqXG4gKiBDcmVhdGVkIGJ5IElnb3IgRXNjb2JhciBvbiAyMDEyLTAzLTEwLiBQbGVhc2UgcmVwb3J0IGFueSBidWcgYXQgaHR0cDovL2Jsb2cuaWdvcmVzY29iYXIuY29tXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDEyIElnb3IgRXNjb2JhciBodHRwOi8vYmxvZy5pZ29yZXNjb2Jhci5jb21cbiAqXG4gKiBUaGUgTUlUIExpY2Vuc2UgKGh0dHA6Ly93d3cub3BlbnNvdXJjZS5vcmcvbGljZW5zZXMvbWl0LWxpY2Vuc2UucGhwKVxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uXG4gKiBvYnRhaW5pbmcgYSBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvblxuICogZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0XG4gKiByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSxcbiAqIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gKiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGVcbiAqIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nXG4gKiBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlXG4gKiBpbmNsdWRlZCBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELFxuICogRVhQUkVTUyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTXG4gKiBPRiBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORFxuICogTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFRcbiAqIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLFxuICogV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HXG4gKiBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SXG4gKiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG4gKi9cblxuLyoganNoaW50IGxheGJyZWFrOiB0cnVlICovXG4vKiBnbG9iYWwgZGVmaW5lLCBqUXVlcnksIFplcHRvICovXG5cbid1c2Ugc3RyaWN0JztcblxuLy8gVU1EIChVbml2ZXJzYWwgTW9kdWxlIERlZmluaXRpb24pIHBhdHRlcm5zIGZvciBKYXZhU2NyaXB0IG1vZHVsZXMgdGhhdCB3b3JrIGV2ZXJ5d2hlcmUuXG4vLyBodHRwczovL2dpdGh1Yi5jb20vdW1kanMvdW1kL2Jsb2IvbWFzdGVyL2pxdWVyeVBsdWdpbkNvbW1vbmpzLmpzXG4oZnVuY3Rpb24gKGZhY3RvcnkpIHtcblxuICAgIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAgICAgZGVmaW5lKFsnanF1ZXJ5J10sIGZhY3RvcnkpO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnKSB7XG4gICAgICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeShyZXF1aXJlKCdqcXVlcnknKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZmFjdG9yeShqUXVlcnkgfHwgWmVwdG8pO1xuICAgIH1cblxufShmdW5jdGlvbiAoJCkge1xuXG4gICAgdmFyIE1hc2sgPSBmdW5jdGlvbiAoZWwsIG1hc2ssIG9wdGlvbnMpIHtcbiAgICAgICAgZWwgPSAkKGVsKTtcblxuICAgICAgICB2YXIgak1hc2sgPSB0aGlzLCBvbGRWYWx1ZSA9IGVsLnZhbCgpLCByZWdleE1hc2s7XG5cbiAgICAgICAgbWFzayA9IHR5cGVvZiBtYXNrID09PSAnZnVuY3Rpb24nID8gbWFzayhlbC52YWwoKSwgdW5kZWZpbmVkLCBlbCwgIG9wdGlvbnMpIDogbWFzaztcblxuICAgICAgICB2YXIgcCA9IHtcbiAgICAgICAgICAgIGludmFsaWQ6IFtdLFxuICAgICAgICAgICAgZ2V0Q2FyZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgc2VsLFxuICAgICAgICAgICAgICAgICAgICAgICAgcG9zID0gMCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGN0cmwgPSBlbC5nZXQoMCksXG4gICAgICAgICAgICAgICAgICAgICAgICBkU2VsID0gZG9jdW1lbnQuc2VsZWN0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgY1NlbFN0YXJ0ID0gY3RybC5zZWxlY3Rpb25TdGFydDtcblxuICAgICAgICAgICAgICAgICAgICAvLyBJRSBTdXBwb3J0XG4gICAgICAgICAgICAgICAgICAgIGlmIChkU2VsICYmIG5hdmlnYXRvci5hcHBWZXJzaW9uLmluZGV4T2YoJ01TSUUgMTAnKSA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbCA9IGRTZWwuY3JlYXRlUmFuZ2UoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbC5tb3ZlU3RhcnQoJ2NoYXJhY3RlcicsIGVsLmlzKCdpbnB1dCcpID8gLWVsLnZhbCgpLmxlbmd0aCA6IC1lbC50ZXh0KCkubGVuZ3RoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBvcyA9IHNlbC50ZXh0Lmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAvLyBGaXJlZm94IHN1cHBvcnRcbiAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAoY1NlbFN0YXJ0IHx8IGNTZWxTdGFydCA9PT0gJzAnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwb3MgPSBjU2VsU3RhcnQ7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcG9zO1xuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHt9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2V0Q2FyZXQ6IGZ1bmN0aW9uKHBvcykge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlbC5pcygnOmZvY3VzJykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciByYW5nZSwgY3RybCA9IGVsLmdldCgwKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGN0cmwuc2V0U2VsZWN0aW9uUmFuZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdHJsLnNldFNlbGVjdGlvblJhbmdlKHBvcyxwb3MpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjdHJsLmNyZWF0ZVRleHRSYW5nZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJhbmdlID0gY3RybC5jcmVhdGVUZXh0UmFuZ2UoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByYW5nZS5jb2xsYXBzZSh0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByYW5nZS5tb3ZlRW5kKCdjaGFyYWN0ZXInLCBwb3MpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJhbmdlLm1vdmVTdGFydCgnY2hhcmFjdGVyJywgcG9zKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByYW5nZS5zZWxlY3QoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHt9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZXZlbnRzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBlbFxuICAgICAgICAgICAgICAgIC5vbignaW5wdXQubWFzayBrZXl1cC5tYXNrJywgcC5iZWhhdmlvdXIpXG4gICAgICAgICAgICAgICAgLm9uKCdwYXN0ZS5tYXNrIGRyb3AubWFzaycsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZWwua2V5ZG93bigpLmtleXVwKCk7XG4gICAgICAgICAgICAgICAgICAgIH0sIDEwMCk7XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAub24oJ2NoYW5nZS5tYXNrJywgZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgZWwuZGF0YSgnY2hhbmdlZCcsIHRydWUpO1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLm9uKCdibHVyLm1hc2snLCBmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICBpZiAob2xkVmFsdWUgIT09IGVsLnZhbCgpICYmICFlbC5kYXRhKCdjaGFuZ2VkJykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsLnRyaWdnZXJIYW5kbGVyKCdjaGFuZ2UnKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbC5kYXRhKCdjaGFuZ2VkJywgZmFsc2UpO1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLy8gaXQncyB2ZXJ5IGltcG9ydGFudCB0aGF0IHRoaXMgY2FsbGJhY2sgcmVtYWlucyBpbiB0aGlzIHBvc2l0aW9uXG4gICAgICAgICAgICAgICAgLy8gb3RoZXJ3aGlzZSBvbGRWYWx1ZSBpdCdzIGdvaW5nIHRvIHdvcmsgYnVnZ3lcbiAgICAgICAgICAgICAgICAub24oJ2JsdXIubWFzaycsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBvbGRWYWx1ZSA9IGVsLnZhbCgpO1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLy8gc2VsZWN0IGFsbCB0ZXh0IG9uIGZvY3VzXG4gICAgICAgICAgICAgICAgLm9uKCdmb2N1cy5tYXNrJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG9wdGlvbnMuc2VsZWN0T25Gb2N1cyA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgJChlLnRhcmdldCkuc2VsZWN0KCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC8vIGNsZWFyIHRoZSB2YWx1ZSBpZiBpdCBub3QgY29tcGxldGUgdGhlIG1hc2tcbiAgICAgICAgICAgICAgICAub24oJ2ZvY3Vzb3V0Lm1hc2snLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG9wdGlvbnMuY2xlYXJJZk5vdE1hdGNoICYmICFyZWdleE1hc2sudGVzdChwLnZhbCgpKSkge1xuICAgICAgICAgICAgICAgICAgICAgICBwLnZhbCgnJyk7XG4gICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdldFJlZ2V4TWFzazogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgdmFyIG1hc2tDaHVua3MgPSBbXSwgdHJhbnNsYXRpb24sIHBhdHRlcm4sIG9wdGlvbmFsLCByZWN1cnNpdmUsIG9SZWN1cnNpdmUsIHI7XG5cbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG1hc2subGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgdHJhbnNsYXRpb24gPSBqTWFzay50cmFuc2xhdGlvblttYXNrLmNoYXJBdChpKV07XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHRyYW5zbGF0aW9uKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHBhdHRlcm4gPSB0cmFuc2xhdGlvbi5wYXR0ZXJuLnRvU3RyaW5nKCkucmVwbGFjZSgvLnsxfSR8Xi57MX0vZywgJycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9uYWwgPSB0cmFuc2xhdGlvbi5vcHRpb25hbDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlY3Vyc2l2ZSA9IHRyYW5zbGF0aW9uLnJlY3Vyc2l2ZTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlY3Vyc2l2ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hc2tDaHVua3MucHVzaChtYXNrLmNoYXJBdChpKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb1JlY3Vyc2l2ZSA9IHtkaWdpdDogbWFzay5jaGFyQXQoaSksIHBhdHRlcm46IHBhdHRlcm59O1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXNrQ2h1bmtzLnB1c2goIW9wdGlvbmFsICYmICFyZWN1cnNpdmUgPyBwYXR0ZXJuIDogKHBhdHRlcm4gKyAnPycpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgbWFza0NodW5rcy5wdXNoKG1hc2suY2hhckF0KGkpLnJlcGxhY2UoL1stXFwvXFxcXF4kKis/LigpfFtcXF17fV0vZywgJ1xcXFwkJicpKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHIgPSBtYXNrQ2h1bmtzLmpvaW4oJycpO1xuXG4gICAgICAgICAgICAgICAgaWYgKG9SZWN1cnNpdmUpIHtcbiAgICAgICAgICAgICAgICAgICAgciA9IHIucmVwbGFjZShuZXcgUmVnRXhwKCcoJyArIG9SZWN1cnNpdmUuZGlnaXQgKyAnKC4qJyArIG9SZWN1cnNpdmUuZGlnaXQgKyAnKT8pJyksICcoJDEpPycpXG4gICAgICAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UobmV3IFJlZ0V4cChvUmVjdXJzaXZlLmRpZ2l0LCAnZycpLCBvUmVjdXJzaXZlLnBhdHRlcm4pO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJldHVybiBuZXcgUmVnRXhwKHIpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGRlc3Ryb3lFdmVudHM6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGVsLm9mZihbJ2lucHV0JywgJ2tleWRvd24nLCAna2V5dXAnLCAncGFzdGUnLCAnZHJvcCcsICdibHVyJywgJ2ZvY3Vzb3V0JywgJyddLmpvaW4oJy5tYXNrICcpKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB2YWw6IGZ1bmN0aW9uKHYpIHtcbiAgICAgICAgICAgICAgICB2YXIgaXNJbnB1dCA9IGVsLmlzKCdpbnB1dCcpLFxuICAgICAgICAgICAgICAgICAgICBtZXRob2QgPSBpc0lucHV0ID8gJ3ZhbCcgOiAndGV4dCcsXG4gICAgICAgICAgICAgICAgICAgIHI7XG5cbiAgICAgICAgICAgICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVsW21ldGhvZF0oKSAhPT0gdikge1xuICAgICAgICAgICAgICAgICAgICAgICAgZWxbbWV0aG9kXSh2KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByID0gZWw7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgciA9IGVsW21ldGhvZF0oKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gcjtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBnZXRNQ2hhcnNCZWZvcmVDb3VudDogZnVuY3Rpb24oaW5kZXgsIG9uQ2xlYW5WYWwpIHtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBjb3VudCA9IDAsIGkgPSAwLCBtYXNrTCA9IG1hc2subGVuZ3RoOyBpIDwgbWFza0wgJiYgaSA8IGluZGV4OyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFqTWFzay50cmFuc2xhdGlvblttYXNrLmNoYXJBdChpKV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGluZGV4ID0gb25DbGVhblZhbCA/IGluZGV4ICsgMSA6IGluZGV4O1xuICAgICAgICAgICAgICAgICAgICAgICAgY291bnQrKztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gY291bnQ7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgY2FyZXRQb3M6IGZ1bmN0aW9uIChvcmlnaW5hbENhcmV0UG9zLCBvbGRMZW5ndGgsIG5ld0xlbmd0aCwgbWFza0RpZikge1xuICAgICAgICAgICAgICAgIHZhciB0cmFuc2xhdGlvbiA9IGpNYXNrLnRyYW5zbGF0aW9uW21hc2suY2hhckF0KE1hdGgubWluKG9yaWdpbmFsQ2FyZXRQb3MgLSAxLCBtYXNrLmxlbmd0aCAtIDEpKV07XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gIXRyYW5zbGF0aW9uID8gcC5jYXJldFBvcyhvcmlnaW5hbENhcmV0UG9zICsgMSwgb2xkTGVuZ3RoLCBuZXdMZW5ndGgsIG1hc2tEaWYpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA6IE1hdGgubWluKG9yaWdpbmFsQ2FyZXRQb3MgKyBuZXdMZW5ndGggLSBvbGRMZW5ndGggLSBtYXNrRGlmLCBuZXdMZW5ndGgpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGJlaGF2aW91cjogZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgIGUgPSBlIHx8IHdpbmRvdy5ldmVudDtcbiAgICAgICAgICAgICAgICBwLmludmFsaWQgPSBbXTtcbiAgICAgICAgICAgICAgICB2YXIga2V5Q29kZSA9IGUua2V5Q29kZSB8fCBlLndoaWNoO1xuICAgICAgICAgICAgICAgIGlmICgkLmluQXJyYXkoa2V5Q29kZSwgak1hc2suYnlQYXNzS2V5cykgPT09IC0xKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIGNhcmV0UG9zID0gcC5nZXRDYXJldCgpLFxuICAgICAgICAgICAgICAgICAgICAgICAgY3VyclZhbCA9IHAudmFsKCksXG4gICAgICAgICAgICAgICAgICAgICAgICBjdXJyVmFsTCA9IGN1cnJWYWwubGVuZ3RoLFxuICAgICAgICAgICAgICAgICAgICAgICAgY2hhbmdlQ2FyZXQgPSBjYXJldFBvcyA8IGN1cnJWYWxMLFxuICAgICAgICAgICAgICAgICAgICAgICAgbmV3VmFsID0gcC5nZXRNYXNrZWQoKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ld1ZhbEwgPSBuZXdWYWwubGVuZ3RoLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWFza0RpZiA9IHAuZ2V0TUNoYXJzQmVmb3JlQ291bnQobmV3VmFsTCAtIDEpIC0gcC5nZXRNQ2hhcnNCZWZvcmVDb3VudChjdXJyVmFsTCAtIDEpO1xuXG4gICAgICAgICAgICAgICAgICAgIHAudmFsKG5ld1ZhbCk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gY2hhbmdlIGNhcmV0IGJ1dCBhdm9pZCBDVFJMK0FcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNoYW5nZUNhcmV0ICYmICEoa2V5Q29kZSA9PT0gNjUgJiYgZS5jdHJsS2V5KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQXZvaWQgYWRqdXN0aW5nIGNhcmV0IG9uIGJhY2tzcGFjZSBvciBkZWxldGVcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghKGtleUNvZGUgPT09IDggfHwga2V5Q29kZSA9PT0gNDYpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FyZXRQb3MgPSBwLmNhcmV0UG9zKGNhcmV0UG9zLCBjdXJyVmFsTCwgbmV3VmFsTCwgbWFza0RpZik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBwLnNldENhcmV0KGNhcmV0UG9zKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBwLmNhbGxiYWNrcyhlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZ2V0TWFza2VkOiBmdW5jdGlvbihza2lwTWFza0NoYXJzKSB7XG4gICAgICAgICAgICAgICAgdmFyIGJ1ZiA9IFtdLFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IHAudmFsKCksXG4gICAgICAgICAgICAgICAgICAgIG0gPSAwLCBtYXNrTGVuID0gbWFzay5sZW5ndGgsXG4gICAgICAgICAgICAgICAgICAgIHYgPSAwLCB2YWxMZW4gPSB2YWx1ZS5sZW5ndGgsXG4gICAgICAgICAgICAgICAgICAgIG9mZnNldCA9IDEsIGFkZE1ldGhvZCA9ICdwdXNoJyxcbiAgICAgICAgICAgICAgICAgICAgcmVzZXRQb3MgPSAtMSxcbiAgICAgICAgICAgICAgICAgICAgbGFzdE1hc2tDaGFyLFxuICAgICAgICAgICAgICAgICAgICBjaGVjaztcblxuICAgICAgICAgICAgICAgIGlmIChvcHRpb25zLnJldmVyc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgYWRkTWV0aG9kID0gJ3Vuc2hpZnQnO1xuICAgICAgICAgICAgICAgICAgICBvZmZzZXQgPSAtMTtcbiAgICAgICAgICAgICAgICAgICAgbGFzdE1hc2tDaGFyID0gMDtcbiAgICAgICAgICAgICAgICAgICAgbSA9IG1hc2tMZW4gLSAxO1xuICAgICAgICAgICAgICAgICAgICB2ID0gdmFsTGVuIC0gMTtcbiAgICAgICAgICAgICAgICAgICAgY2hlY2sgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbSA+IC0xICYmIHYgPiAtMTtcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBsYXN0TWFza0NoYXIgPSBtYXNrTGVuIC0gMTtcbiAgICAgICAgICAgICAgICAgICAgY2hlY2sgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbSA8IG1hc2tMZW4gJiYgdiA8IHZhbExlbjtcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB3aGlsZSAoY2hlY2soKSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgbWFza0RpZ2l0ID0gbWFzay5jaGFyQXQobSksXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWxEaWdpdCA9IHZhbHVlLmNoYXJBdCh2KSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyYW5zbGF0aW9uID0gak1hc2sudHJhbnNsYXRpb25bbWFza0RpZ2l0XTtcblxuICAgICAgICAgICAgICAgICAgICBpZiAodHJhbnNsYXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2YWxEaWdpdC5tYXRjaCh0cmFuc2xhdGlvbi5wYXR0ZXJuKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJ1ZlthZGRNZXRob2RdKHZhbERpZ2l0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRyYW5zbGF0aW9uLnJlY3Vyc2l2ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVzZXRQb3MgPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNldFBvcyA9IG07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobSA9PT0gbGFzdE1hc2tDaGFyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtID0gcmVzZXRQb3MgLSBvZmZzZXQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobGFzdE1hc2tDaGFyID09PSByZXNldFBvcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbSAtPSBvZmZzZXQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbSArPSBvZmZzZXQ7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHRyYW5zbGF0aW9uLm9wdGlvbmFsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbSArPSBvZmZzZXQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdiAtPSBvZmZzZXQ7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHRyYW5zbGF0aW9uLmZhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnVmW2FkZE1ldGhvZF0odHJhbnNsYXRpb24uZmFsbGJhY2spO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG0gKz0gb2Zmc2V0O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHYgLT0gb2Zmc2V0O1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgcC5pbnZhbGlkLnB1c2goe3A6IHYsIHY6IHZhbERpZ2l0LCBlOiB0cmFuc2xhdGlvbi5wYXR0ZXJufSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB2ICs9IG9mZnNldDtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghc2tpcE1hc2tDaGFycykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJ1ZlthZGRNZXRob2RdKG1hc2tEaWdpdCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2YWxEaWdpdCA9PT0gbWFza0RpZ2l0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdiArPSBvZmZzZXQ7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIG0gKz0gb2Zmc2V0O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdmFyIGxhc3RNYXNrQ2hhckRpZ2l0ID0gbWFzay5jaGFyQXQobGFzdE1hc2tDaGFyKTtcbiAgICAgICAgICAgICAgICBpZiAobWFza0xlbiA9PT0gdmFsTGVuICsgMSAmJiAhak1hc2sudHJhbnNsYXRpb25bbGFzdE1hc2tDaGFyRGlnaXRdKSB7XG4gICAgICAgICAgICAgICAgICAgIGJ1Zi5wdXNoKGxhc3RNYXNrQ2hhckRpZ2l0KTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gYnVmLmpvaW4oJycpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGNhbGxiYWNrczogZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICB2YXIgdmFsID0gcC52YWwoKSxcbiAgICAgICAgICAgICAgICAgICAgY2hhbmdlZCA9IHZhbCAhPT0gb2xkVmFsdWUsXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHRBcmdzID0gW3ZhbCwgZSwgZWwsIG9wdGlvbnNdLFxuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayA9IGZ1bmN0aW9uKG5hbWUsIGNyaXRlcmlhLCBhcmdzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnNbbmFtZV0gPT09ICdmdW5jdGlvbicgJiYgY3JpdGVyaWEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcHRpb25zW25hbWVdLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgY2FsbGJhY2soJ29uQ2hhbmdlJywgY2hhbmdlZCA9PT0gdHJ1ZSwgZGVmYXVsdEFyZ3MpO1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKCdvbktleVByZXNzJywgY2hhbmdlZCA9PT0gdHJ1ZSwgZGVmYXVsdEFyZ3MpO1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKCdvbkNvbXBsZXRlJywgdmFsLmxlbmd0aCA9PT0gbWFzay5sZW5ndGgsIGRlZmF1bHRBcmdzKTtcbiAgICAgICAgICAgICAgICBjYWxsYmFjaygnb25JbnZhbGlkJywgcC5pbnZhbGlkLmxlbmd0aCA+IDAsIFt2YWwsIGUsIGVsLCBwLmludmFsaWQsIG9wdGlvbnNdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuXG4gICAgICAgIC8vIHB1YmxpYyBtZXRob2RzXG4gICAgICAgIGpNYXNrLm1hc2sgPSBtYXNrO1xuICAgICAgICBqTWFzay5vcHRpb25zID0gb3B0aW9ucztcbiAgICAgICAgak1hc2sucmVtb3ZlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgY2FyZXQgPSBwLmdldENhcmV0KCk7XG4gICAgICAgICAgICBwLmRlc3Ryb3lFdmVudHMoKTtcbiAgICAgICAgICAgIHAudmFsKGpNYXNrLmdldENsZWFuVmFsKCkpO1xuICAgICAgICAgICAgcC5zZXRDYXJldChjYXJldCAtIHAuZ2V0TUNoYXJzQmVmb3JlQ291bnQoY2FyZXQpKTtcbiAgICAgICAgICAgIHJldHVybiBlbDtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBnZXQgdmFsdWUgd2l0aG91dCBtYXNrXG4gICAgICAgIGpNYXNrLmdldENsZWFuVmFsID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgIHJldHVybiBwLmdldE1hc2tlZCh0cnVlKTtcbiAgICAgICAgfTtcblxuICAgICAgIGpNYXNrLmluaXQgPSBmdW5jdGlvbihvbmx5TWFzaykge1xuICAgICAgICAgICAgb25seU1hc2sgPSBvbmx5TWFzayB8fCBmYWxzZTtcbiAgICAgICAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgICAgICAgICBqTWFzay5ieVBhc3NLZXlzID0gJC5qTWFza0dsb2JhbHMuYnlQYXNzS2V5cztcbiAgICAgICAgICAgIGpNYXNrLnRyYW5zbGF0aW9uID0gJC5qTWFza0dsb2JhbHMudHJhbnNsYXRpb247XG5cbiAgICAgICAgICAgIGpNYXNrLnRyYW5zbGF0aW9uID0gJC5leHRlbmQoe30sIGpNYXNrLnRyYW5zbGF0aW9uLCBvcHRpb25zLnRyYW5zbGF0aW9uKTtcbiAgICAgICAgICAgIGpNYXNrID0gJC5leHRlbmQodHJ1ZSwge30sIGpNYXNrLCBvcHRpb25zKTtcblxuICAgICAgICAgICAgcmVnZXhNYXNrID0gcC5nZXRSZWdleE1hc2soKTtcblxuICAgICAgICAgICAgaWYgKG9ubHlNYXNrID09PSBmYWxzZSkge1xuXG4gICAgICAgICAgICAgICAgaWYgKG9wdGlvbnMucGxhY2Vob2xkZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgZWwuYXR0cigncGxhY2Vob2xkZXInICwgb3B0aW9ucy5wbGFjZWhvbGRlcik7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gdGhpcyBpcyBuZWNlc3NhcnksIG90aGVyd2lzZSBpZiB0aGUgdXNlciBzdWJtaXQgdGhlIGZvcm1cbiAgICAgICAgICAgICAgICAvLyBhbmQgdGhlbiBwcmVzcyB0aGUgXCJiYWNrXCIgYnV0dG9uLCB0aGUgYXV0b2NvbXBsZXRlIHdpbGwgZXJhc2VcbiAgICAgICAgICAgICAgICAvLyB0aGUgZGF0YS4gV29ya3MgZmluZSBvbiBJRTkrLCBGRiwgT3BlcmEsIFNhZmFyaS5cbiAgICAgICAgICAgICAgICBpZiAoJCgnaW5wdXQnKS5sZW5ndGggJiYgJ29uaW5wdXQnIGluICQoJ2lucHV0JylbMF0gPT09IGZhbHNlICYmIGVsLmF0dHIoJ2F1dG9jb21wbGV0ZScpID09PSAnb24nKSB7XG4gICAgICAgICAgICAgICAgICBlbC5hdHRyKCdhdXRvY29tcGxldGUnLCAnb2ZmJyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcC5kZXN0cm95RXZlbnRzKCk7XG4gICAgICAgICAgICAgICAgcC5ldmVudHMoKTtcblxuICAgICAgICAgICAgICAgIHZhciBjYXJldCA9IHAuZ2V0Q2FyZXQoKTtcbiAgICAgICAgICAgICAgICBwLnZhbChwLmdldE1hc2tlZCgpKTtcbiAgICAgICAgICAgICAgICBwLnNldENhcmV0KGNhcmV0ICsgcC5nZXRNQ2hhcnNCZWZvcmVDb3VudChjYXJldCwgdHJ1ZSkpO1xuXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHAuZXZlbnRzKCk7XG4gICAgICAgICAgICAgICAgcC52YWwocC5nZXRNYXNrZWQoKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgak1hc2suaW5pdCghZWwuaXMoJ2lucHV0JykpO1xuICAgIH07XG5cbiAgICAkLm1hc2tXYXRjaGVycyA9IHt9O1xuICAgIHZhciBIVE1MQXR0cmlidXRlcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBpbnB1dCA9ICQodGhpcyksXG4gICAgICAgICAgICAgICAgb3B0aW9ucyA9IHt9LFxuICAgICAgICAgICAgICAgIHByZWZpeCA9ICdkYXRhLW1hc2stJyxcbiAgICAgICAgICAgICAgICBtYXNrID0gaW5wdXQuYXR0cignZGF0YS1tYXNrJyk7XG5cbiAgICAgICAgICAgIGlmIChpbnB1dC5hdHRyKHByZWZpeCArICdyZXZlcnNlJykpIHtcbiAgICAgICAgICAgICAgICBvcHRpb25zLnJldmVyc2UgPSB0cnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoaW5wdXQuYXR0cihwcmVmaXggKyAnY2xlYXJpZm5vdG1hdGNoJykpIHtcbiAgICAgICAgICAgICAgICBvcHRpb25zLmNsZWFySWZOb3RNYXRjaCA9IHRydWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChpbnB1dC5hdHRyKHByZWZpeCArICdzZWxlY3RvbmZvY3VzJykgPT09ICd0cnVlJykge1xuICAgICAgICAgICAgICAgb3B0aW9ucy5zZWxlY3RPbkZvY3VzID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKG5vdFNhbWVNYXNrT2JqZWN0KGlucHV0LCBtYXNrLCBvcHRpb25zKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBpbnB1dC5kYXRhKCdtYXNrJywgbmV3IE1hc2sodGhpcywgbWFzaywgb3B0aW9ucykpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBub3RTYW1lTWFza09iamVjdCA9IGZ1bmN0aW9uKGZpZWxkLCBtYXNrLCBvcHRpb25zKSB7XG4gICAgICAgICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICAgICAgICAgIHZhciBtYXNrT2JqZWN0ID0gJChmaWVsZCkuZGF0YSgnbWFzaycpLFxuICAgICAgICAgICAgICAgIHN0cmluZ2lmeSA9IEpTT04uc3RyaW5naWZ5LFxuICAgICAgICAgICAgICAgIHZhbHVlID0gJChmaWVsZCkudmFsKCkgfHwgJChmaWVsZCkudGV4dCgpO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG1hc2sgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICAgICAgbWFzayA9IG1hc2sodmFsdWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gdHlwZW9mIG1hc2tPYmplY3QgIT09ICdvYmplY3QnIHx8IHN0cmluZ2lmeShtYXNrT2JqZWN0Lm9wdGlvbnMpICE9PSBzdHJpbmdpZnkob3B0aW9ucykgfHwgbWFza09iamVjdC5tYXNrICE9PSBtYXNrO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge31cbiAgICAgICAgfTtcblxuXG4gICAgJC5mbi5tYXNrID0gZnVuY3Rpb24obWFzaywgb3B0aW9ucykge1xuICAgICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICAgICAgdmFyIHNlbGVjdG9yID0gdGhpcy5zZWxlY3RvcixcbiAgICAgICAgICAgIGdsb2JhbHMgPSAkLmpNYXNrR2xvYmFscyxcbiAgICAgICAgICAgIGludGVydmFsID0gJC5qTWFza0dsb2JhbHMud2F0Y2hJbnRlcnZhbCxcbiAgICAgICAgICAgIG1hc2tGdW5jdGlvbiA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGlmIChub3RTYW1lTWFza09iamVjdCh0aGlzLCBtYXNrLCBvcHRpb25zKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gJCh0aGlzKS5kYXRhKCdtYXNrJywgbmV3IE1hc2sodGhpcywgbWFzaywgb3B0aW9ucykpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgJCh0aGlzKS5lYWNoKG1hc2tGdW5jdGlvbik7XG5cbiAgICAgICAgaWYgKHNlbGVjdG9yICYmIHNlbGVjdG9yICE9PSAnJyAmJiBnbG9iYWxzLndhdGNoSW5wdXRzKSB7XG4gICAgICAgICAgICBjbGVhckludGVydmFsKCQubWFza1dhdGNoZXJzW3NlbGVjdG9yXSk7XG4gICAgICAgICAgICAkLm1hc2tXYXRjaGVyc1tzZWxlY3Rvcl0gPSBzZXRJbnRlcnZhbChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICQoZG9jdW1lbnQpLmZpbmQoc2VsZWN0b3IpLmVhY2gobWFza0Z1bmN0aW9uKTtcbiAgICAgICAgICAgIH0sIGludGVydmFsKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuXG4gICAgJC5mbi51bm1hc2sgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgY2xlYXJJbnRlcnZhbCgkLm1hc2tXYXRjaGVyc1t0aGlzLnNlbGVjdG9yXSk7XG4gICAgICAgIGRlbGV0ZSAkLm1hc2tXYXRjaGVyc1t0aGlzLnNlbGVjdG9yXTtcbiAgICAgICAgcmV0dXJuIHRoaXMuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBkYXRhTWFzayA9ICQodGhpcykuZGF0YSgnbWFzaycpO1xuICAgICAgICAgICAgaWYgKGRhdGFNYXNrKSB7XG4gICAgICAgICAgICAgICAgZGF0YU1hc2sucmVtb3ZlKCkucmVtb3ZlRGF0YSgnbWFzaycpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgJC5mbi5jbGVhblZhbCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5kYXRhKCdtYXNrJykuZ2V0Q2xlYW5WYWwoKTtcbiAgICB9O1xuXG4gICAgJC5hcHBseURhdGFNYXNrID0gZnVuY3Rpb24oc2VsZWN0b3IpIHtcbiAgICAgICAgc2VsZWN0b3IgPSBzZWxlY3RvciB8fCAkLmpNYXNrR2xvYmFscy5tYXNrRWxlbWVudHM7XG4gICAgICAgIHZhciAkc2VsZWN0b3IgPSAoc2VsZWN0b3IgaW5zdGFuY2VvZiAkKSA/IHNlbGVjdG9yIDogJChzZWxlY3Rvcik7XG4gICAgICAgICRzZWxlY3Rvci5maWx0ZXIoJC5qTWFza0dsb2JhbHMuZGF0YU1hc2tBdHRyKS5lYWNoKEhUTUxBdHRyaWJ1dGVzKTtcbiAgICB9O1xuXG4gICAgdmFyIGdsb2JhbHMgPSB7XG4gICAgICAgIG1hc2tFbGVtZW50czogJ2lucHV0LHRkLHNwYW4sZGl2JyxcbiAgICAgICAgZGF0YU1hc2tBdHRyOiAnKltkYXRhLW1hc2tdJyxcbiAgICAgICAgZGF0YU1hc2s6IHRydWUsXG4gICAgICAgIHdhdGNoSW50ZXJ2YWw6IDMwMCxcbiAgICAgICAgd2F0Y2hJbnB1dHM6IHRydWUsXG4gICAgICAgIHdhdGNoRGF0YU1hc2s6IGZhbHNlLFxuICAgICAgICBieVBhc3NLZXlzOiBbOSwgMTYsIDE3LCAxOCwgMzYsIDM3LCAzOCwgMzksIDQwLCA5MV0sXG4gICAgICAgIHRyYW5zbGF0aW9uOiB7XG4gICAgICAgICAgICAnMCc6IHtwYXR0ZXJuOiAvXFxkL30sXG4gICAgICAgICAgICAnOSc6IHtwYXR0ZXJuOiAvXFxkLywgb3B0aW9uYWw6IHRydWV9LFxuICAgICAgICAgICAgJyMnOiB7cGF0dGVybjogL1xcZC8sIHJlY3Vyc2l2ZTogdHJ1ZX0sXG4gICAgICAgICAgICAnQSc6IHtwYXR0ZXJuOiAvW2EtekEtWjAtOV0vfSxcbiAgICAgICAgICAgICdTJzoge3BhdHRlcm46IC9bYS16QS1aXS99XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgJC5qTWFza0dsb2JhbHMgPSAkLmpNYXNrR2xvYmFscyB8fCB7fTtcbiAgICBnbG9iYWxzID0gJC5qTWFza0dsb2JhbHMgPSAkLmV4dGVuZCh0cnVlLCB7fSwgZ2xvYmFscywgJC5qTWFza0dsb2JhbHMpO1xuXG4gICAgLy8gbG9va2luZyBmb3IgaW5wdXRzIHdpdGggZGF0YS1tYXNrIGF0dHJpYnV0ZVxuICAgIGlmIChnbG9iYWxzLmRhdGFNYXNrKSB7ICQuYXBwbHlEYXRhTWFzaygpOyB9XG5cbiAgICBzZXRJbnRlcnZhbChmdW5jdGlvbigpe1xuICAgICAgICBpZiAoJC5qTWFza0dsb2JhbHMud2F0Y2hEYXRhTWFzaykgeyAkLmFwcGx5RGF0YU1hc2soKTsgfVxuICAgIH0sIGdsb2JhbHMud2F0Y2hJbnRlcnZhbCk7XG59KSk7XG4iLCIvKipcbiAqIGpRdWVyeSBGb3JtIFZhbGlkYXRvclxuICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gKiBDcmVhdGVkIGJ5IFZpY3RvciBKb25zc29uIDxodHRwOi8vd3d3LnZpY3RvcmpvbnNzb24uc2U+XG4gKlxuICogQHdlYnNpdGUgaHR0cDovL2Zvcm12YWxpZGF0b3IubmV0L1xuICogQGxpY2Vuc2UgTUlUXG4gKiBAdmVyc2lvbiAyLjIuODFcbiAqL1xuKGZ1bmN0aW9uICgkKSB7XG5cbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIHZhciAkd2luZG93ID0gJCh3aW5kb3cpLFxuICAgIF9nZXRJbnB1dFBhcmVudENvbnRhaW5lciA9IGZ1bmN0aW9uICgkZWxlbSkge1xuICAgICAgaWYgKCRlbGVtLnZhbEF0dHIoJ2Vycm9yLW1zZy1jb250YWluZXInKSkge1xuICAgICAgICByZXR1cm4gJCgkZWxlbS52YWxBdHRyKCdlcnJvci1tc2ctY29udGFpbmVyJykpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyICRwYXJlbnQgPSAkZWxlbS5wYXJlbnQoKTtcbiAgICAgICAgaWYgKCAhJHBhcmVudC5oYXNDbGFzcygnZm9ybS1ncm91cCcpICYmICEkcGFyZW50LmNsb3Nlc3QoJ2Zvcm0nKS5oYXNDbGFzcygnZm9ybS1ob3Jpem9udGFsJykgKSB7XG4gICAgICAgICAgdmFyICRmb3JtR3JvdXAgPSAkcGFyZW50LmNsb3Nlc3QoJy5mb3JtLWdyb3VwJyk7XG4gICAgICAgICAgaWYgKCRmb3JtR3JvdXAubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm4gJGZvcm1Hcm91cC5lcSgwKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICRwYXJlbnQ7XG4gICAgICB9XG4gICAgfSxcbiAgICBfYXBwbHlFcnJvclN0eWxlID0gZnVuY3Rpb24gKCRlbGVtLCBjb25mKSB7XG4gICAgICAkZWxlbVxuICAgICAgICAuYWRkQ2xhc3MoY29uZi5lcnJvckVsZW1lbnRDbGFzcylcbiAgICAgICAgLnJlbW92ZUNsYXNzKCd2YWxpZCcpO1xuXG4gICAgICBfZ2V0SW5wdXRQYXJlbnRDb250YWluZXIoJGVsZW0pXG4gICAgICAgIC5hZGRDbGFzcyhjb25mLmlucHV0UGFyZW50Q2xhc3NPbkVycm9yKVxuICAgICAgICAucmVtb3ZlQ2xhc3MoY29uZi5pbnB1dFBhcmVudENsYXNzT25TdWNjZXNzKTtcblxuICAgICAgaWYgKGNvbmYuYm9yZGVyQ29sb3JPbkVycm9yICE9PSAnJykge1xuICAgICAgICAkZWxlbS5jc3MoJ2JvcmRlci1jb2xvcicsIGNvbmYuYm9yZGVyQ29sb3JPbkVycm9yKTtcbiAgICAgIH1cbiAgICB9LFxuICAgIF9yZW1vdmVFcnJvclN0eWxlID0gZnVuY3Rpb24gKCRlbGVtLCBjb25mKSB7XG4gICAgICAkZWxlbS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyICR0aGlzID0gJCh0aGlzKTtcblxuICAgICAgICBfc2V0SW5saW5lRXJyb3JNZXNzYWdlKCR0aGlzLCAnJywgY29uZiwgY29uZi5lcnJvck1lc3NhZ2VQb3NpdGlvbik7XG5cbiAgICAgICAgJHRoaXNcbiAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ3ZhbGlkJylcbiAgICAgICAgICAucmVtb3ZlQ2xhc3MoY29uZi5lcnJvckVsZW1lbnRDbGFzcylcbiAgICAgICAgICAuY3NzKCdib3JkZXItY29sb3InLCAnJyk7XG5cbiAgICAgICAgX2dldElucHV0UGFyZW50Q29udGFpbmVyKCR0aGlzKVxuICAgICAgICAgIC5yZW1vdmVDbGFzcyhjb25mLmlucHV0UGFyZW50Q2xhc3NPbkVycm9yKVxuICAgICAgICAgIC5yZW1vdmVDbGFzcyhjb25mLmlucHV0UGFyZW50Q2xhc3NPblN1Y2Nlc3MpXG4gICAgICAgICAgLmZpbmQoJy4nICsgY29uZi5lcnJvck1lc3NhZ2VDbGFzcykgLy8gcmVtb3ZlIGlubGluZSBzcGFuIGhvbGRpbmcgZXJyb3IgbWVzc2FnZVxuICAgICAgICAgICAgLnJlbW92ZSgpO1xuICAgICAgfSk7XG4gICAgfSxcbiAgICBfc2V0SW5saW5lRXJyb3JNZXNzYWdlID0gZnVuY3Rpb24gKCRpbnB1dCwgbWVzcywgY29uZiwgJG1lc3NhZ2VDb250YWluZXIpIHtcbiAgICAgIHZhciBjdXN0b20gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgkaW5wdXQuYXR0cignbmFtZScpICsgJ19lcnJfbXNnJyksXG4gICAgICAgICAgc2V0RXJyb3JNZXNzYWdlID0gZnVuY3Rpb24oJGVsZW0pIHtcbiAgICAgICAgICAgICR3aW5kb3cudHJpZ2dlcigndmFsaWRhdGlvbkVycm9yRGlzcGxheScsIFskaW5wdXQsICRlbGVtXSlcbiAgICAgICAgICAgICRlbGVtLmh0bWwobWVzcyk7XG4gICAgICAgICAgfTtcblxuICAgICAgaWYgKGN1c3RvbSkge1xuICAgICAgICBzZXRFcnJvck1lc3NhZ2UoJChjdXN0b20pKTtcbiAgICAgIH1cbiAgICAgIGVsc2UgaWYgKHR5cGVvZiAkbWVzc2FnZUNvbnRhaW5lciA9PSAnb2JqZWN0Jykge1xuICAgICAgICB2YXIgJGZvdW5kID0gZmFsc2U7XG4gICAgICAgICRtZXNzYWdlQ29udGFpbmVyLmZpbmQoJy4nICsgY29uZi5lcnJvck1lc3NhZ2VDbGFzcykuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgaWYgKHRoaXMuaW5wdXRSZWZlcmVyID09ICRpbnB1dFswXSkge1xuICAgICAgICAgICAgJGZvdW5kID0gJCh0aGlzKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoJGZvdW5kKSB7XG4gICAgICAgICAgaWYgKCFtZXNzKSB7XG4gICAgICAgICAgICAkZm91bmQucmVtb3ZlKCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHNldEVycm9yTWVzc2FnZSgkZm91bmQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB2YXIgJG1lc3MgPSAkKCc8ZGl2IGNsYXNzPVwiJyArIGNvbmYuZXJyb3JNZXNzYWdlQ2xhc3MgKyAnXCI+PC9kaXY+Jyk7XG4gICAgICAgICAgc2V0RXJyb3JNZXNzYWdlKCRtZXNzKTtcbiAgICAgICAgICAkbWVzc1swXS5pbnB1dFJlZmVyZXIgPSAkaW5wdXRbMF07XG4gICAgICAgICAgJG1lc3NhZ2VDb250YWluZXIucHJlcGVuZCgkbWVzcyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuXG4gICAgICAgIHZhciAkcGFyZW50ID0gX2dldElucHV0UGFyZW50Q29udGFpbmVyKCRpbnB1dCksXG4gICAgICAgICAgICAkbWVzcyA9ICRwYXJlbnQuZmluZCgnLicgKyBjb25mLmVycm9yTWVzc2FnZUNsYXNzICsgJy5oZWxwLWJsb2NrJyk7XG5cbiAgICAgICAgaWYgKCRtZXNzLmxlbmd0aCA9PSAwKSB7XG4gICAgICAgICAgJG1lc3MgPSAkKCc8c3Bhbj48L3NwYW4+JykuYWRkQ2xhc3MoJ2hlbHAtYmxvY2snKS5hZGRDbGFzcyhjb25mLmVycm9yTWVzc2FnZUNsYXNzKTtcbiAgICAgICAgICAkbWVzcy5hcHBlbmRUbygkcGFyZW50KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHNldEVycm9yTWVzc2FnZSgkbWVzcyk7XG4gICAgICB9XG4gICAgfSxcbiAgICBfdGVtcGxhdGVNZXNzYWdlID0gZnVuY3Rpb24gKCRmb3JtLCB0aXRsZSwgZXJyb3JNZXNzYWdlcywgY29uZikge1xuICAgICAgdmFyIG1lc3NhZ2VzID0gY29uZi5lcnJvck1lc3NhZ2VUZW1wbGF0ZS5tZXNzYWdlcy5yZXBsYWNlKC9cXHtlcnJvclRpdGxlXFx9L2csIHRpdGxlKSxcbiAgICAgICAgICBmaWVsZHMgPSBbXSxcbiAgICAgICAgICBjb250YWluZXI7XG5cbiAgICAgICQuZWFjaChlcnJvck1lc3NhZ2VzLCBmdW5jdGlvbiAoaSwgbXNnKSB7XG4gICAgICAgIGZpZWxkcy5wdXNoKGNvbmYuZXJyb3JNZXNzYWdlVGVtcGxhdGUuZmllbGQucmVwbGFjZSgvXFx7bXNnXFx9L2csIG1zZykpO1xuICAgICAgfSk7XG5cbiAgICAgIG1lc3NhZ2VzID0gbWVzc2FnZXMucmVwbGFjZSgvXFx7ZmllbGRzXFx9L2csIGZpZWxkcy5qb2luKCcnKSk7XG4gICAgICBjb250YWluZXIgPSBjb25mLmVycm9yTWVzc2FnZVRlbXBsYXRlLmNvbnRhaW5lci5yZXBsYWNlKC9cXHtlcnJvck1lc3NhZ2VDbGFzc1xcfS9nLCBjb25mLmVycm9yTWVzc2FnZUNsYXNzKTtcbiAgICAgIGNvbnRhaW5lciA9IGNvbnRhaW5lci5yZXBsYWNlKC9cXHttZXNzYWdlc1xcfS9nLCBtZXNzYWdlcyk7XG4gICAgICAkZm9ybS5jaGlsZHJlbigpLmVxKDApLmJlZm9yZShjb250YWluZXIpO1xuICAgIH07XG5cblxuICAvKipcbiAgICogQXNzaWducyB2YWxpZGF0ZUlucHV0T25CbHVyIGZ1bmN0aW9uIHRvIGVsZW1lbnRzIGJsdXIgZXZlbnRcbiAgICpcbiAgICogQHBhcmFtIHtPYmplY3R9IGxhbmd1YWdlIE9wdGlvbmFsLCB3aWxsIG92ZXJyaWRlICQuZm9ybVV0aWxzLkxBTkdcbiAgICogQHBhcmFtIHtPYmplY3R9IGNvbmYgT3B0aW9uYWwsIHdpbGwgb3ZlcnJpZGUgdGhlIGRlZmF1bHQgc2V0dGluZ3NcbiAgICogQHJldHVybiB7alF1ZXJ5fVxuICAgKi9cbiAgJC5mbi52YWxpZGF0ZU9uQmx1ciA9IGZ1bmN0aW9uIChsYW5ndWFnZSwgY29uZikge1xuICAgIHRoaXMuZmluZCgnKltkYXRhLXZhbGlkYXRpb25dJylcbiAgICAgIC5iaW5kKCdibHVyLnZhbGlkYXRpb24nLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICQodGhpcykudmFsaWRhdGVJbnB1dE9uQmx1cihsYW5ndWFnZSwgY29uZiwgdHJ1ZSwgJ2JsdXInKTtcbiAgICAgIH0pO1xuICAgIGlmIChjb25mLnZhbGlkYXRlQ2hlY2tib3hSYWRpb09uQ2xpY2spIHtcbiAgICAgIC8vIGJpbmQgY2xpY2sgZXZlbnQgdG8gdmFsaWRhdGUgb24gY2xpY2sgZm9yIHJhZGlvICYgY2hlY2tib3hlcyBmb3IgbmljZSBVWFxuICAgICAgdGhpcy5maW5kKCdpbnB1dFt0eXBlPWNoZWNrYm94XVtkYXRhLXZhbGlkYXRpb25dLGlucHV0W3R5cGU9cmFkaW9dW2RhdGEtdmFsaWRhdGlvbl0nKVxuICAgICAgICAuYmluZCgnY2xpY2sudmFsaWRhdGlvbicsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAkKHRoaXMpLnZhbGlkYXRlSW5wdXRPbkJsdXIobGFuZ3VhZ2UsIGNvbmYsIHRydWUsICdjbGljaycpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICAvKlxuICAgKiBBc3NpZ25zIHZhbGlkYXRlSW5wdXRPbkJsdXIgZnVuY3Rpb24gdG8gZWxlbWVudHMgY3VzdG9tIGV2ZW50XG4gICAqIEBwYXJhbSB7T2JqZWN0fSBsYW5ndWFnZSBPcHRpb25hbCwgd2lsbCBvdmVycmlkZSAkLmZvcm1VdGlscy5MQU5HXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBzZXR0aW5ncyBPcHRpb25hbCwgd2lsbCBvdmVycmlkZSB0aGUgZGVmYXVsdCBzZXR0aW5nc1xuICAgKiAqIEByZXR1cm4ge2pRdWVyeX1cbiAgICovXG4gICQuZm4udmFsaWRhdGVPbkV2ZW50ID0gZnVuY3Rpb24gKGxhbmd1YWdlLCBzZXR0aW5ncykge1xuICAgIHRoaXMuZmluZCgnKltkYXRhLXZhbGlkYXRpb24tZXZlbnRdJylcbiAgICAgIC5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyICRlbCA9ICQodGhpcyksXG4gICAgICAgICAgICBldHlwZSA9ICRlbC52YWxBdHRyKFwiZXZlbnRcIik7XG4gICAgICAgIGlmIChldHlwZSkge1xuICAgICAgICAgICRlbFxuICAgICAgICAgICAgLnVuYmluZChldHlwZSArIFwiLnZhbGlkYXRpb25cIilcbiAgICAgICAgICAgIC5iaW5kKGV0eXBlICsgXCIudmFsaWRhdGlvblwiLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICQodGhpcykudmFsaWRhdGVJbnB1dE9uQmx1cihsYW5ndWFnZSwgc2V0dGluZ3MsIHRydWUsIGV0eXBlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICAvKipcbiAgICogZmFkZSBpbiBoZWxwIG1lc3NhZ2Ugd2hlbiBpbnB1dCBnYWlucyBmb2N1c1xuICAgKiBmYWRlIG91dCB3aGVuIGlucHV0IGxvc2VzIGZvY3VzXG4gICAqIDxpbnB1dCBkYXRhLWhlbHA9XCJUaGUgaW5mbyB0aGF0IEkgd2FudCB0byBkaXNwbGF5IGZvciB0aGUgdXNlciB3aGVuIGlucHV0IGlzIGZvY3VzZWRcIiAuLi4gLz5cbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd9IGF0dHJOYW1lIC0gT3B0aW9uYWwsIGRlZmF1bHQgaXMgZGF0YS1oZWxwXG4gICAqIEByZXR1cm4ge2pRdWVyeX1cbiAgICovXG4gICQuZm4uc2hvd0hlbHBPbkZvY3VzID0gZnVuY3Rpb24gKGF0dHJOYW1lKSB7XG4gICAgaWYgKCFhdHRyTmFtZSkge1xuICAgICAgYXR0ck5hbWUgPSAnZGF0YS12YWxpZGF0aW9uLWhlbHAnO1xuICAgIH1cblxuICAgIC8vIFJlbW92ZSBwcmV2aW91c2x5IGFkZGVkIGV2ZW50IGxpc3RlbmVyc1xuICAgIHRoaXMuZmluZCgnLmhhcy1oZWxwLXR4dCcpXG4gICAgICAudmFsQXR0cignaGFzLWtleXVwLWV2ZW50JywgZmFsc2UpXG4gICAgICAucmVtb3ZlQ2xhc3MoJ2hhcy1oZWxwLXR4dCcpO1xuXG4gICAgLy8gQWRkIGhlbHAgdGV4dCBsaXN0ZW5lcnNcbiAgICB0aGlzLmZpbmQoJ3RleHRhcmVhLGlucHV0JykuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgJGVsZW0gPSAkKHRoaXMpLFxuICAgICAgICAgIGNsYXNzTmFtZSA9ICdqcXVlcnlfZm9ybV9oZWxwXycgKyAoJGVsZW0uYXR0cignbmFtZScpIHx8ICcnKS5yZXBsYWNlKC8oOnxcXC58XFxbfFxcXSkvZywgXCJcIiksXG4gICAgICAgICAgaGVscCA9ICRlbGVtLmF0dHIoYXR0ck5hbWUpO1xuXG4gICAgICBpZiAoaGVscCkge1xuICAgICAgICAkZWxlbVxuICAgICAgICAgIC5hZGRDbGFzcygnaGFzLWhlbHAtdHh0JylcbiAgICAgICAgICAudW5iaW5kKCdmb2N1cy5oZWxwJylcbiAgICAgICAgICAuYmluZCgnZm9jdXMuaGVscCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciAkaGVscCA9ICRlbGVtLnBhcmVudCgpLmZpbmQoJy4nICsgY2xhc3NOYW1lKTtcbiAgICAgICAgICAgIGlmICgkaGVscC5sZW5ndGggPT0gMCkge1xuICAgICAgICAgICAgICAkaGVscCA9ICQoJzxzcGFuIC8+JylcbiAgICAgICAgICAgICAgICAgICAgICAgIC5hZGRDbGFzcyhjbGFzc05hbWUpXG4gICAgICAgICAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ2hlbHAnKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmFkZENsYXNzKCdoZWxwLWJsb2NrJykgLy8gdHdpdHRlciBic1xuICAgICAgICAgICAgICAgICAgICAgICAgLnRleHQoaGVscClcbiAgICAgICAgICAgICAgICAgICAgICAgIC5oaWRlKCk7XG5cbiAgICAgICAgICAgICAgJGVsZW0uYWZ0ZXIoJGhlbHApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgJGhlbHAuZmFkZUluKCk7XG4gICAgICAgICAgfSlcbiAgICAgICAgICAudW5iaW5kKCdibHVyLmhlbHAnKVxuICAgICAgICAgIC5iaW5kKCdibHVyLmhlbHAnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAkKHRoaXMpXG4gICAgICAgICAgICAgIC5wYXJlbnQoKVxuICAgICAgICAgICAgICAuZmluZCgnLicgKyBjbGFzc05hbWUpXG4gICAgICAgICAgICAgIC5mYWRlT3V0KCdzbG93Jyk7XG4gICAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICAvKipcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2JcbiAgICogQHBhcmFtIHtPYmplY3R9IFtjb25mXVxuICAgKiBAcGFyYW0ge09iamVjdH0gW2xhbmddXG4gICAqL1xuICAkLmZuLnZhbGlkYXRlID0gZnVuY3Rpb24oY2IsIGNvbmYsIGxhbmcpIHtcbiAgICB2YXIgbGFuZ3VhZ2UgPSAkLmV4dGVuZCh7fSwgJC5mb3JtVXRpbHMuTEFORywgbGFuZyB8fCB7fSk7XG4gICAgdGhpcy5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgdmFyICRlbGVtID0gJCh0aGlzKSxcbiAgICAgICAgICBmb3JtRGVmYXVsdENvbmZpZyA9ICRlbGVtLmNsb3Nlc3QoJ2Zvcm0nKS5nZXQoMCkudmFsaWRhdGlvbkNvbmZpZyB8fCB7fTtcblxuICAgICAgJGVsZW0ub25lKCd2YWxpZGF0aW9uJywgZnVuY3Rpb24oZXZ0LCBpc1ZhbGlkKSB7XG4gICAgICAgIGlmKCB0eXBlb2YgY2IgPT0gJ2Z1bmN0aW9uJyApXG4gICAgICAgICAgY2IoaXNWYWxpZCwgdGhpcywgZXZ0KTtcbiAgICAgIH0pO1xuXG4gICAgICAkZWxlbS52YWxpZGF0ZUlucHV0T25CbHVyKFxuICAgICAgICAgIGxhbmd1YWdlLFxuICAgICAgICAgICQuZXh0ZW5kKHt9LCBmb3JtRGVmYXVsdENvbmZpZywgY29uZsKgfHwge30pLFxuICAgICAgICAgIHRydWVcbiAgICAgICAgKTtcbiAgICB9KTtcbiAgfTtcblxuICAvKipcbiAgICogVGVsbHMgd2hldGhlciBvciBub3QgdmFsaWRhdGlvbiBvZiB0aGlzIGlucHV0IHdpbGwgaGF2ZSB0byBwb3N0cG9uZSB0aGUgZm9ybSBzdWJtaXQgKClcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICAkLmZuLndpbGxQb3N0cG9uZVZhbGlkYXRpb24gPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gKHRoaXMudmFsQXR0cignc3VnZ2VzdGlvbi1ucicpIHx8XG4gICAgICAgICAgICB0aGlzLnZhbEF0dHIoJ3Bvc3Rwb25lJykgfHxcbiAgICAgICAgICAgIHRoaXMuaGFzQ2xhc3MoJ2hhc0RhdGVwaWNrZXInKSlcbiAgICAgICAgICAmJiAhd2luZG93LnBvc3Rwb25lZFZhbGlkYXRpb247XG4gIH07XG5cbiAgLyoqXG4gICAqIFZhbGlkYXRlIHNpbmdsZSBpbnB1dCB3aGVuIGl0IGxvc2VzIGZvY3VzXG4gICAqIHNob3dzIGVycm9yIG1lc3NhZ2UgaW4gYSBzcGFuIGVsZW1lbnRcbiAgICogdGhhdCBpcyBhcHBlbmRlZCB0byB0aGUgcGFyZW50IGVsZW1lbnRcbiAgICpcbiAgICogQHBhcmFtIHtPYmplY3R9IFtsYW5ndWFnZV0gT3B0aW9uYWwsIHdpbGwgb3ZlcnJpZGUgJC5mb3JtVXRpbHMuTEFOR1xuICAgKiBAcGFyYW0ge09iamVjdH0gW2NvbmZdIE9wdGlvbmFsLCB3aWxsIG92ZXJyaWRlIHRoZSBkZWZhdWx0IHNldHRpbmdzXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gYXR0YWNoS2V5dXBFdmVudCBPcHRpb25hbFxuICAgKiBAcGFyYW0ge1N0cmluZ30gZXZlbnRUeXBlXG4gICAqIEByZXR1cm4ge2pRdWVyeX1cbiAgICovXG4gICQuZm4udmFsaWRhdGVJbnB1dE9uQmx1ciA9IGZ1bmN0aW9uIChsYW5ndWFnZSwgY29uZiwgYXR0YWNoS2V5dXBFdmVudCwgZXZlbnRUeXBlKSB7XG5cbiAgICAkLmZvcm1VdGlscy5ldmVudFR5cGUgPSBldmVudFR5cGU7XG5cbiAgICBpZiAoIHRoaXMud2lsbFBvc3Rwb25lVmFsaWRhdGlvbigpICkge1xuICAgICAgLy8gVGhpcyB2YWxpZGF0aW9uIGhhcyB0byBiZSBwb3N0cG9uZWRcbiAgICAgIHZhciBfc2VsZiA9IHRoaXMsXG4gICAgICAgICAgcG9zdHBvbmVUaW1lID0gdGhpcy52YWxBdHRyKCdwb3N0cG9uZScpIHx8IDIwMDtcblxuICAgICAgd2luZG93LnBvc3Rwb25lZFZhbGlkYXRpb24gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIF9zZWxmLnZhbGlkYXRlSW5wdXRPbkJsdXIobGFuZ3VhZ2UsIGNvbmYsIGF0dGFjaEtleXVwRXZlbnQsIGV2ZW50VHlwZSk7XG4gICAgICAgIHdpbmRvdy5wb3N0cG9uZWRWYWxpZGF0aW9uID0gZmFsc2U7XG4gICAgICB9O1xuXG4gICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHdpbmRvdy5wb3N0cG9uZWRWYWxpZGF0aW9uKSB7XG4gICAgICAgICAgd2luZG93LnBvc3Rwb25lZFZhbGlkYXRpb24oKTtcbiAgICAgICAgfVxuICAgICAgfSwgcG9zdHBvbmVUaW1lKTtcblxuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgbGFuZ3VhZ2UgPSAkLmV4dGVuZCh7fSwgJC5mb3JtVXRpbHMuTEFORywgbGFuZ3VhZ2UgfHwge30pO1xuICAgIF9yZW1vdmVFcnJvclN0eWxlKHRoaXMsIGNvbmYpO1xuICAgIHZhciAkZWxlbSA9IHRoaXMsXG4gICAgICAgICRmb3JtID0gJGVsZW0uY2xvc2VzdChcImZvcm1cIiksXG4gICAgICAgIHZhbGlkYXRpb25SdWxlID0gJGVsZW0uYXR0cihjb25mLnZhbGlkYXRpb25SdWxlQXR0cmlidXRlKSxcbiAgICAgICAgcmVzdWx0ID0gJC5mb3JtVXRpbHMudmFsaWRhdGVJbnB1dChcbiAgICAgICAgICAgICAgICAgICAgJGVsZW0sXG4gICAgICAgICAgICAgICAgICAgIGxhbmd1YWdlLFxuICAgICAgICAgICAgICAgICAgICBjb25mLFxuICAgICAgICAgICAgICAgICAgICAkZm9ybSxcbiAgICAgICAgICAgICAgICAgICAgZXZlbnRUeXBlXG4gICAgICAgICAgICAgICAgICApO1xuXG4gICAgaWYgKCByZXN1bHQuaXNWYWxpZCApIHtcbiAgICAgIGlmKCByZXN1bHQuc2hvdWxkQ2hhbmdlRGlzcGxheSApIHtcbiAgICAgICAgICAkZWxlbS5hZGRDbGFzcygndmFsaWQnKTtcbiAgICAgICAgICBfZ2V0SW5wdXRQYXJlbnRDb250YWluZXIoJGVsZW0pXG4gICAgICAgICAgICAuYWRkQ2xhc3MoY29uZi5pbnB1dFBhcmVudENsYXNzT25TdWNjZXNzKTtcbiAgICAgIH1cbiAgICB9XG4gICAgZWxzZSBpZiAoIXJlc3VsdC5pc1ZhbGlkKSB7XG5cbiAgICAgIF9hcHBseUVycm9yU3R5bGUoJGVsZW0sIGNvbmYpO1xuICAgICAgX3NldElubGluZUVycm9yTWVzc2FnZSgkZWxlbSwgcmVzdWx0LmVycm9yTXNnLCBjb25mLCBjb25mLmVycm9yTWVzc2FnZVBvc2l0aW9uKTtcblxuICAgICAgaWYgKGF0dGFjaEtleXVwRXZlbnQpIHtcbiAgICAgICAgJGVsZW1cbiAgICAgICAgICAudW5iaW5kKCdrZXl1cC52YWxpZGF0aW9uJylcbiAgICAgICAgICAuYmluZCgna2V5dXAudmFsaWRhdGlvbicsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICQodGhpcykudmFsaWRhdGVJbnB1dE9uQmx1cihsYW5ndWFnZSwgY29uZiwgZmFsc2UsICdrZXl1cCcpO1xuICAgICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4gIC8qKlxuICAgKiBTaG9ydCBoYW5kIGZvciBmZXRjaGluZy9hZGRpbmcvcmVtb3ZpbmcgZWxlbWVudCBhdHRyaWJ1dGVzXG4gICAqIHByZWZpeGVkIHdpdGggJ2RhdGEtdmFsaWRhdGlvbi0nXG4gICAqXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lXG4gICAqIEBwYXJhbSB7U3RyaW5nfEJvb2xlYW59IFt2YWxdXG4gICAqIEByZXR1cm4gc3RyaW5nfHVuZGVmaW5lZFxuICAgKiBAcHJvdGVjdGVkXG4gICAqL1xuICAkLmZuLnZhbEF0dHIgPSBmdW5jdGlvbiAobmFtZSwgdmFsKSB7XG4gICAgaWYgKHZhbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gdGhpcy5hdHRyKCdkYXRhLXZhbGlkYXRpb24tJyArIG5hbWUpO1xuICAgIH0gZWxzZSBpZiAodmFsID09PSBmYWxzZSB8fCB2YWwgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiB0aGlzLnJlbW92ZUF0dHIoJ2RhdGEtdmFsaWRhdGlvbi0nICsgbmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChuYW1lLmxlbmd0aCA+IDApIG5hbWUgPSAnLScgKyBuYW1lO1xuICAgICAgcmV0dXJuIHRoaXMuYXR0cignZGF0YS12YWxpZGF0aW9uJyArIG5hbWUsIHZhbCk7XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBGdW5jdGlvbiB0aGF0IHZhbGlkYXRlcyBhbGwgaW5wdXRzIGluIGFjdGl2ZSBmb3JtXG4gICAqXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBbbGFuZ3VhZ2VdXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBbY29uZl1cbiAgICogQHBhcmFtIHtCb29sZWFufSBbZGlzcGxheUVycm9yXSBEZWZhdWx0cyB0byB0cnVlXG4gICAqL1xuICAkLmZuLmlzVmFsaWQgPSBmdW5jdGlvbiAobGFuZ3VhZ2UsIGNvbmYsIGRpc3BsYXlFcnJvcikge1xuXG4gICAgaWYgKCQuZm9ybVV0aWxzLmlzTG9hZGluZ01vZHVsZXMpIHtcbiAgICAgIHZhciAkc2VsZiA9IHRoaXM7XG4gICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgJHNlbGYuaXNWYWxpZChsYW5ndWFnZSwgY29uZiwgZGlzcGxheUVycm9yKTtcbiAgICAgIH0sIDIwMCk7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25mID0gJC5leHRlbmQoe30sICQuZm9ybVV0aWxzLmRlZmF1bHRDb25maWcoKSwgY29uZiB8fCB7fSk7XG4gICAgbGFuZ3VhZ2UgPSAkLmV4dGVuZCh7fSwgJC5mb3JtVXRpbHMuTEFORywgbGFuZ3VhZ2UgfHwge30pO1xuICAgIGRpc3BsYXlFcnJvciA9IGRpc3BsYXlFcnJvciAhPT0gZmFsc2U7XG5cbiAgICBpZiAoJC5mb3JtVXRpbHMuZXJyb3JEaXNwbGF5UHJldmVudGVkV2hlbkhhbHRlZCkge1xuICAgICAgLy8gaXNWYWxpZCgpIHdhcyBjYWxsZWQgcHJvZ3JhbW1hdGljYWxseSB3aXRoIGFyZ3VtZW50IGRpc3BsYXlFcnJvciBzZXRcbiAgICAgIC8vIHRvIGZhbHNlIHdoZW4gdGhlIHZhbGlkYXRpb24gd2FzIGhhbHRlZCBieSBhbnkgb2YgdGhlIHZhbGlkYXRvcnNcbiAgICAgIGRlbGV0ZSAkLmZvcm1VdGlscy5lcnJvckRpc3BsYXlQcmV2ZW50ZWRXaGVuSGFsdGVkXG4gICAgICBkaXNwbGF5RXJyb3IgPSBmYWxzZTtcbiAgICB9XG5cbiAgICAkLmZvcm1VdGlscy5pc1ZhbGlkYXRpbmdFbnRpcmVGb3JtID0gdHJ1ZTtcbiAgICAkLmZvcm1VdGlscy5oYWx0VmFsaWRhdGlvbiA9IGZhbHNlO1xuXG4gICAgLyoqXG4gICAgICogQWRkcyBtZXNzYWdlIHRvIGVycm9yIG1lc3NhZ2Ugc3RhY2sgaWYgbm90IGFscmVhZHkgaW4gdGhlIG1lc3NhZ2Ugc3RhY2tcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBtZXNzXG4gICAgICogQHBhcmEge2pRdWVyeX0gJGVsZW1cbiAgICAgKi9cbiAgICB2YXIgYWRkRXJyb3JNZXNzYWdlID0gZnVuY3Rpb24gKG1lc3MsICRlbGVtKSB7XG4gICAgICAgICAgaWYgKCQuaW5BcnJheShtZXNzLCBlcnJvck1lc3NhZ2VzKSA8IDApIHtcbiAgICAgICAgICAgIGVycm9yTWVzc2FnZXMucHVzaChtZXNzKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZXJyb3JJbnB1dHMucHVzaCgkZWxlbSk7XG4gICAgICAgICAgJGVsZW0uYXR0cignY3VycmVudC1lcnJvcicsIG1lc3MpO1xuICAgICAgICAgIGlmIChkaXNwbGF5RXJyb3IpXG4gICAgICAgICAgICBfYXBwbHlFcnJvclN0eWxlKCRlbGVtLCBjb25mKTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKiogSG9sZHMgaW5wdXRzIChvZiB0eXBlIGNoZWNrb3ggb3IgcmFkaW8pIGFscmVhZHkgdmFsaWRhdGVkLCB0byBwcmV2ZW50IHJlY2hlY2sgb2YgbXVsaXRwbGUgY2hlY2tib3hlcyAmIHJhZGlvcyAqL1xuICAgICAgICBjaGVja2VkSW5wdXRzID0gW10sXG5cbiAgICAgICAgLyoqIEVycm9yIG1lc3NhZ2VzIGZvciB0aGlzIHZhbGlkYXRpb24gKi9cbiAgICAgICAgZXJyb3JNZXNzYWdlcyA9IFtdLFxuXG4gICAgICAgIC8qKiBJbnB1dCBlbGVtZW50cyB3aGljaCB2YWx1ZSB3YXMgbm90IHZhbGlkICovXG4gICAgICAgIGVycm9ySW5wdXRzID0gW10sXG5cbiAgICAgICAgLyoqIEZvcm0gaW5zdGFuY2UgKi9cbiAgICAgICAgJGZvcm0gPSB0aGlzLFxuXG4gICAgICAvKipcbiAgICAgICAqIFRlbGxzIHdoZXRoZXIgb3Igbm90IHRvIHZhbGlkYXRlIGVsZW1lbnQgd2l0aCB0aGlzIG5hbWUgYW5kIG9mIHRoaXMgdHlwZVxuICAgICAgICpcbiAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lXG4gICAgICAgKiBAcGFyYW0ge1N0cmluZ30gdHlwZVxuICAgICAgICogQHJldHVybiB7Qm9vbGVhbn1cbiAgICAgICAqL1xuICAgICAgICBpZ25vcmVJbnB1dCA9IGZ1bmN0aW9uIChuYW1lLCB0eXBlKSB7XG4gICAgICAgIGlmICh0eXBlID09PSAnc3VibWl0JyB8fCB0eXBlID09PSAnYnV0dG9uJyB8fCB0eXBlID09ICdyZXNldCcpIHtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJC5pbkFycmF5KG5hbWUsIGNvbmYuaWdub3JlIHx8IFtdKSA+IC0xO1xuICAgICAgfTtcblxuICAgIC8vIFJlc2V0IHN0eWxlIGFuZCByZW1vdmUgZXJyb3IgY2xhc3NcbiAgICBpZiAoZGlzcGxheUVycm9yKSB7XG4gICAgICAkZm9ybS5maW5kKCcuJyArIGNvbmYuZXJyb3JNZXNzYWdlQ2xhc3MgKyAnLmFsZXJ0JykucmVtb3ZlKCk7XG4gICAgICBfcmVtb3ZlRXJyb3JTdHlsZSgkZm9ybS5maW5kKCcuJyArIGNvbmYuZXJyb3JFbGVtZW50Q2xhc3MgKyAnLC52YWxpZCcpLCBjb25mKTtcbiAgICB9XG5cbiAgICAvLyBWYWxpZGF0ZSBlbGVtZW50IHZhbHVlc1xuICAgICRmb3JtLmZpbmQoJ2lucHV0LHRleHRhcmVhLHNlbGVjdCcpLmZpbHRlcignOm5vdChbdHlwZT1cInN1Ym1pdFwiXSxbdHlwZT1cImJ1dHRvblwiXSknKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciAkZWxlbSA9ICQodGhpcyksXG4gICAgICAgIGVsZW1lbnRUeXBlID0gJGVsZW0uYXR0cigndHlwZScpLFxuICAgICAgICBpc0NoZWNrYm94T3JSYWRpb0J0biA9IGVsZW1lbnRUeXBlID09ICdyYWRpbycgfHwgZWxlbWVudFR5cGUgPT0gJ2NoZWNrYm94JyxcbiAgICAgICAgZWxlbWVudE5hbWUgPSAkZWxlbS5hdHRyKCduYW1lJyk7XG5cbiAgICAgIGlmICghaWdub3JlSW5wdXQoZWxlbWVudE5hbWUsIGVsZW1lbnRUeXBlKSAmJiAoIWlzQ2hlY2tib3hPclJhZGlvQnRuIHx8ICQuaW5BcnJheShlbGVtZW50TmFtZSwgY2hlY2tlZElucHV0cykgPCAwKSkge1xuXG4gICAgICAgIGlmIChpc0NoZWNrYm94T3JSYWRpb0J0bilcbiAgICAgICAgICBjaGVja2VkSW5wdXRzLnB1c2goZWxlbWVudE5hbWUpO1xuXG4gICAgICAgIHZhciByZXN1bHQgPSAkLmZvcm1VdGlscy52YWxpZGF0ZUlucHV0KFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJGVsZW0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsYW5ndWFnZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbmYsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkZm9ybSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdzdWJtaXQnXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKTtcblxuICAgICAgICBpZiggcmVzdWx0LnNob3VsZENoYW5nZURpc3BsYXkgKSB7XG4gICAgICAgICAgaWYgKCAhcmVzdWx0LmlzVmFsaWQgKSB7XG4gICAgICAgICAgICBhZGRFcnJvck1lc3NhZ2UocmVzdWx0LmVycm9yTXNnLCAkZWxlbSk7XG4gICAgICAgICAgfSBlbHNlIGlmKCByZXN1bHQuaXNWYWxpZCApIHtcbiAgICAgICAgICAgICRlbGVtXG4gICAgICAgICAgICAgIC52YWxBdHRyKCdjdXJyZW50LWVycm9yJywgZmFsc2UpXG4gICAgICAgICAgICAgIC5hZGRDbGFzcygndmFsaWQnKTtcblxuICAgICAgICAgICAgX2dldElucHV0UGFyZW50Q29udGFpbmVyKCRlbGVtKVxuICAgICAgICAgICAgICAuYWRkQ2xhc3MoY29uZi5pbnB1dFBhcmVudENsYXNzT25TdWNjZXNzKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIFJ1biB2YWxpZGF0aW9uIGNhbGxiYWNrXG4gICAgaWYgKHR5cGVvZiBjb25mLm9uVmFsaWRhdGUgPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdmFyIGVycm9ycyA9IGNvbmYub25WYWxpZGF0ZSgkZm9ybSk7XG4gICAgICBpZiAoJC5pc0FycmF5KGVycm9ycykpIHtcbiAgICAgICAgJC5lYWNoKGVycm9ycywgZnVuY3Rpb24gKGksIGVycikge1xuICAgICAgICAgIGFkZEVycm9yTWVzc2FnZShlcnIubWVzc2FnZSwgZXJyLmVsZW1lbnQpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIGVsc2UgaWYgKGVycm9ycyAmJiBlcnJvcnMuZWxlbWVudCAmJiBlcnJvcnMubWVzc2FnZSkge1xuICAgICAgICBhZGRFcnJvck1lc3NhZ2UoZXJyb3JzLm1lc3NhZ2UsIGVycm9ycy5lbGVtZW50KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBSZXNldCBmb3JtIHZhbGlkYXRpb24gZmxhZ1xuICAgICQuZm9ybVV0aWxzLmlzVmFsaWRhdGluZ0VudGlyZUZvcm0gPSBmYWxzZTtcblxuICAgIC8vIFZhbGlkYXRpb24gZmFpbGVkXG4gICAgaWYgKCEkLmZvcm1VdGlscy5oYWx0VmFsaWRhdGlvbiAmJiBlcnJvcklucHV0cy5sZW5ndGggPiAwKSB7XG5cbiAgICAgIGlmIChkaXNwbGF5RXJyb3IpIHtcbiAgICAgICAgLy8gZGlzcGxheSBhbGwgZXJyb3IgbWVzc2FnZXMgaW4gdG9wIG9mIGZvcm1cbiAgICAgICAgaWYgKGNvbmYuZXJyb3JNZXNzYWdlUG9zaXRpb24gPT09ICd0b3AnKSB7XG4gICAgICAgICAgX3RlbXBsYXRlTWVzc2FnZSgkZm9ybSwgbGFuZ3VhZ2UuZXJyb3JUaXRsZSwgZXJyb3JNZXNzYWdlcywgY29uZik7XG4gICAgICAgIH1cbiAgICAgICAgLy8gQ3VzdG9taXplIGRpc3BsYXkgbWVzc2FnZVxuICAgICAgICBlbHNlIGlmIChjb25mLmVycm9yTWVzc2FnZVBvc2l0aW9uID09PSAnY3VzdG9tJykge1xuICAgICAgICAgIGlmICh0eXBlb2YgY29uZi5lcnJvck1lc3NhZ2VDdXN0b20gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNvbmYuZXJyb3JNZXNzYWdlQ3VzdG9tKCRmb3JtLCBsYW5ndWFnZS5lcnJvclRpdGxlLCBlcnJvck1lc3NhZ2VzLCBjb25mKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gRGlzcGxheSBlcnJvciBtZXNzYWdlIGJlbG93IGlucHV0IGZpZWxkIG9yIGluIGRlZmluZWQgY29udGFpbmVyXG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICQuZWFjaChlcnJvcklucHV0cywgZnVuY3Rpb24gKGksICRpbnB1dCkge1xuICAgICAgICAgICAgX3NldElubGluZUVycm9yTWVzc2FnZSgkaW5wdXQsICRpbnB1dC5hdHRyKCdjdXJyZW50LWVycm9yJyksIGNvbmYsIGNvbmYuZXJyb3JNZXNzYWdlUG9zaXRpb24pO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNvbmYuc2Nyb2xsVG9Ub3BPbkVycm9yKSB7XG4gICAgICAgICAgJHdpbmRvdy5zY3JvbGxUb3AoJGZvcm0ub2Zmc2V0KCkudG9wIC0gMjApO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBpZiAoIWRpc3BsYXlFcnJvciAmJiAkLmZvcm1VdGlscy5oYWx0VmFsaWRhdGlvbikge1xuICAgICAgJC5mb3JtVXRpbHMuZXJyb3JEaXNwbGF5UHJldmVudGVkV2hlbkhhbHRlZCA9IHRydWU7XG4gICAgfVxuXG4gICAgcmV0dXJuICEkLmZvcm1VdGlscy5oYWx0VmFsaWRhdGlvbjtcbiAgfTtcblxuICAvKipcbiAgICogQGRlcHJlY2F0ZWRcbiAgICogQHBhcmFtIGxhbmd1YWdlXG4gICAqIEBwYXJhbSBjb25mXG4gICAqL1xuICAkLmZuLnZhbGlkYXRlRm9ybSA9IGZ1bmN0aW9uIChsYW5ndWFnZSwgY29uZikge1xuICAgIGlmICh3aW5kb3cuY29uc29sZSAmJiB0eXBlb2Ygd2luZG93LmNvbnNvbGUud2FybiA9PSAnZnVuY3Rpb24nKSB7XG4gICAgICB3aW5kb3cuY29uc29sZS53YXJuKCdVc2Ugb2YgZGVwcmVjYXRlZCBmdW5jdGlvbiAkLnZhbGlkYXRlRm9ybSwgdXNlICQuaXNWYWxpZCBpbnN0ZWFkJyk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmlzVmFsaWQobGFuZ3VhZ2UsIGNvbmYsIHRydWUpO1xuICB9XG5cbiAgLyoqXG4gICAqIFBsdWdpbiBmb3IgZGlzcGxheWluZyBpbnB1dCBsZW5ndGggcmVzdHJpY3Rpb25cbiAgICovXG4gICQuZm4ucmVzdHJpY3RMZW5ndGggPSBmdW5jdGlvbiAobWF4TGVuZ3RoRWxlbWVudCkge1xuICAgIG5ldyAkLmZvcm1VdGlscy5sZW5ndGhSZXN0cmljdGlvbih0aGlzLCBtYXhMZW5ndGhFbGVtZW50KTtcbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICAvKipcbiAgICogQWRkIHN1Z2dlc3Rpb24gZHJvcGRvd24gdG8gaW5wdXRzIGhhdmluZyBkYXRhLXN1Z2dlc3Rpb25zIHdpdGggYSBjb21tYVxuICAgKiBzZXBhcmF0ZWQgc3RyaW5nIHdpdGggc3VnZ2VzdGlvbnNcbiAgICogQHBhcmFtIHtBcnJheX0gW3NldHRpbmdzXVxuICAgKiBAcmV0dXJucyB7alF1ZXJ5fVxuICAgKi9cbiAgJC5mbi5hZGRTdWdnZXN0aW9ucyA9IGZ1bmN0aW9uIChzZXR0aW5ncykge1xuICAgIHZhciBzdWdzID0gZmFsc2U7XG4gICAgdGhpcy5maW5kKCdpbnB1dCcpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgdmFyICRmaWVsZCA9ICQodGhpcyk7XG5cbiAgICAgIHN1Z3MgPSAkLnNwbGl0KCRmaWVsZC5hdHRyKCdkYXRhLXN1Z2dlc3Rpb25zJykpO1xuXG4gICAgICBpZiAoc3Vncy5sZW5ndGggPiAwICYmICEkZmllbGQuaGFzQ2xhc3MoJ2hhcy1zdWdnZXN0aW9ucycpKSB7XG4gICAgICAgICQuZm9ybVV0aWxzLnN1Z2dlc3QoJGZpZWxkLCBzdWdzLCBzZXR0aW5ncyk7XG4gICAgICAgICRmaWVsZC5hZGRDbGFzcygnaGFzLXN1Z2dlc3Rpb25zJyk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgLyoqXG4gICAqIEEgYml0IHNtYXJ0ZXIgc3BsaXQgZnVuY3Rpb25cbiAgICogZGVsaW1pdGVyIGNhbiBiZSBzcGFjZSwgY29tbWEsIGRhc2ggb3IgcGlwZVxuICAgKiBAcGFyYW0ge1N0cmluZ30gdmFsXG4gICAqIEBwYXJhbSB7RnVuY3Rpb258U3RyaW5nfSBbY2FsbGJhY2tdXG4gICAqIEByZXR1cm5zIHtBcnJheXx2b2lkfVxuICAgKi9cbiAgJC5zcGxpdCA9IGZ1bmN0aW9uICh2YWwsIGNhbGxiYWNrKSB7XG4gICAgaWYgKHR5cGVvZiBjYWxsYmFjayAhPSAnZnVuY3Rpb24nKSB7XG4gICAgICAvLyByZXR1cm4gYXJyYXlcbiAgICAgIGlmICghdmFsKVxuICAgICAgICByZXR1cm4gW107XG4gICAgICB2YXIgdmFsdWVzID0gW107XG4gICAgICAkLmVhY2godmFsLnNwbGl0KGNhbGxiYWNrID8gY2FsbGJhY2sgOiAvWyx8XFwtXFxzXVxccyovZyksXG4gICAgICAgIGZ1bmN0aW9uIChpLCBzdHIpIHtcbiAgICAgICAgICBzdHIgPSAkLnRyaW0oc3RyKTtcbiAgICAgICAgICBpZiAoc3RyLmxlbmd0aClcbiAgICAgICAgICAgIHZhbHVlcy5wdXNoKHN0cik7XG4gICAgICAgIH1cbiAgICAgICk7XG4gICAgICByZXR1cm4gdmFsdWVzO1xuICAgIH0gZWxzZSBpZiAodmFsKSB7XG4gICAgICAvLyBleGVjIGNhbGxiYWNrIGZ1bmMgb24gZWFjaFxuICAgICAgJC5lYWNoKHZhbC5zcGxpdCgvWyx8XFwtXFxzXVxccyovZyksXG4gICAgICAgIGZ1bmN0aW9uIChpLCBzdHIpIHtcbiAgICAgICAgICBzdHIgPSAkLnRyaW0oc3RyKTtcbiAgICAgICAgICBpZiAoc3RyLmxlbmd0aClcbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhzdHIsIGkpO1xuICAgICAgICB9XG4gICAgICApO1xuICAgIH1cbiAgfTtcblxuICAvKipcbiAgICogU2hvcnQgaGFuZCBmdW5jdGlvbiB0aGF0IG1ha2VzIHRoZSB2YWxpZGF0aW9uIHNldHVwIHJlcXVpcmUgbGVzcyBjb2RlXG4gICAqIEBwYXJhbSBjb25mXG4gICAqL1xuICAkLnZhbGlkYXRlID0gZnVuY3Rpb24gKGNvbmYpIHtcblxuICAgIHZhciBkZWZhdWx0Q29uZiA9ICQuZXh0ZW5kKCQuZm9ybVV0aWxzLmRlZmF1bHRDb25maWcoKSwge1xuICAgICAgZm9ybTogJ2Zvcm0nLFxuICAgICAgLypcbiAgICAgICAqIEVuYWJsZSBjdXN0b20gZXZlbnQgZm9yIHZhbGlkYXRpb25cbiAgICAgICAqL1xuICAgICAgdmFsaWRhdGVPbkV2ZW50OiBmYWxzZSxcbiAgICAgIHZhbGlkYXRlT25CbHVyOiB0cnVlLFxuICAgICAgdmFsaWRhdGVDaGVja2JveFJhZGlvT25DbGljazogdHJ1ZSxcbiAgICAgIHNob3dIZWxwT25Gb2N1czogdHJ1ZSxcbiAgICAgIGFkZFN1Z2dlc3Rpb25zOiB0cnVlLFxuICAgICAgbW9kdWxlczogJycsXG4gICAgICBvbk1vZHVsZXNMb2FkZWQ6IG51bGwsXG4gICAgICBsYW5ndWFnZTogZmFsc2UsXG4gICAgICBvblN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgb25FcnJvcjogZmFsc2UsXG4gICAgICBvbkVsZW1lbnRWYWxpZGF0ZTogZmFsc2UsXG4gICAgfSk7XG5cbiAgICBjb25mID0gJC5leHRlbmQoZGVmYXVsdENvbmYsIGNvbmYgfHwge30pO1xuXG4gICAgaWYoIGNvbmYubGFuZyAmJiBjb25mLmxhbmcgIT0gJ2VuJyApIHtcbiAgICAgIHZhciBsYW5nTW9kdWxlID0gJ2xhbmcvJytjb25mLmxhbmcrJy5qcyc7XG4gICAgICBjb25mLm1vZHVsZXMgKz0gY29uZi5tb2R1bGVzLmxlbmd0aCA/ICcsJytsYW5nTW9kdWxlIDogbGFuZ01vZHVsZTtcbiAgICB9XG5cbiAgICAvLyBBZGQgdmFsaWRhdGlvbiB0byBmb3Jtc1xuICAgICQoY29uZi5mb3JtKS5lYWNoKGZ1bmN0aW9uIChpLCBmb3JtKSB7XG5cbiAgICAgIC8vIE1ha2UgYSByZWZlcmVuY2UgdG8gdGhlIGNvbmZpZyBmb3IgdGhpcyBmb3JtXG4gICAgICBmb3JtLnZhbGlkYXRpb25Db25maWcgPSBjb25mO1xuXG4gICAgICAvLyBUcmlnZ2VyIGpRdWVyeSBldmVudCB0aGF0IHdlJ3JlIGFib3V0IHRvIHNldHVwIHZhXG4gICAgICB2YXIgJGZvcm0gPSAkKGZvcm0pO1xuICAgICAgJHdpbmRvdy50cmlnZ2VyKCdmb3JtVmFsaWRhdGlvblNldHVwJywgWyRmb3JtLCBjb25mXSk7XG5cbiAgICAgIC8vIFJlbW92ZSBjbGFzc2VzIGFuZCBldmVudCBoYW5kbGVycyB0aGF0IG1pZ2h0IGhhdmUgYmVlblxuICAgICAgLy8gYWRkZWQgYnkgYSBwcmV2aW91cyBjYWxsIHRvICQudmFsaWRhdGVcbiAgICAgICRmb3JtLmZpbmQoJy5oYXMtaGVscC10eHQnKVxuICAgICAgICAgIC51bmJpbmQoJ2ZvY3VzLnZhbGlkYXRpb24nKVxuICAgICAgICAgIC51bmJpbmQoJ2JsdXIudmFsaWRhdGlvbicpO1xuXG4gICAgICAkZm9ybVxuICAgICAgICAucmVtb3ZlQ2xhc3MoJ2hhcy12YWxpZGF0aW9uLWNhbGxiYWNrJylcbiAgICAgICAgLnVuYmluZCgnc3VibWl0LnZhbGlkYXRpb24nKVxuICAgICAgICAudW5iaW5kKCdyZXNldC52YWxpZGF0aW9uJylcbiAgICAgICAgLmZpbmQoJ2lucHV0W2RhdGEtdmFsaWRhdGlvbl0sdGV4dGFyZWFbZGF0YS12YWxpZGF0aW9uXScpXG4gICAgICAgICAgLnVuYmluZCgnYmx1ci52YWxpZGF0aW9uJyk7XG5cbiAgICAgIC8vIFZhbGlkYXRlIHdoZW4gc3VibWl0dGVkXG4gICAgICAkZm9ybS5iaW5kKCdzdWJtaXQudmFsaWRhdGlvbicsIGZ1bmN0aW9uICgpIHtcblxuICAgICAgICB2YXIgJGZvcm0gPSAkKHRoaXMpO1xuXG4gICAgICAgIGlmICgkLmZvcm1VdGlscy5oYWx0VmFsaWRhdGlvbikge1xuICAgICAgICAgIC8vIHByZXNzaW5nIHNldmVyYWwgdGltZXMgb24gc3VibWl0IGJ1dHRvbiB3aGlsZSB2YWxpZGF0aW9uIGlzIGhhbHRlZFxuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICgkLmZvcm1VdGlscy5pc0xvYWRpbmdNb2R1bGVzKSB7XG4gICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAkZm9ybS50cmlnZ2VyKCdzdWJtaXQudmFsaWRhdGlvbicpO1xuICAgICAgICAgIH0sIDIwMCk7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHZhbGlkID0gJGZvcm0uaXNWYWxpZChjb25mLmxhbmd1YWdlLCBjb25mKTtcblxuICAgICAgICBpZiAoJC5mb3JtVXRpbHMuaGFsdFZhbGlkYXRpb24pIHtcbiAgICAgICAgICAvLyBWYWxpZGF0aW9uIGdvdCBoYWx0ZWQgYnkgb25lIG9mIHRoZSB2YWxpZGF0b3JzXG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlmICh2YWxpZCAmJiB0eXBlb2YgY29uZi5vblN1Y2Nlc3MgPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgdmFyIGNhbGxiYWNrUmVzcG9uc2UgPSBjb25mLm9uU3VjY2VzcygkZm9ybSk7XG4gICAgICAgICAgICBpZiAoY2FsbGJhY2tSZXNwb25zZSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSBpZiAoIXZhbGlkICYmIHR5cGVvZiBjb25mLm9uRXJyb3IgPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY29uZi5vbkVycm9yKCRmb3JtKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHZhbGlkO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSlcbiAgICAgIC5iaW5kKCdyZXNldC52YWxpZGF0aW9uJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAvLyByZW1vdmUgbWVzc2FnZXNcbiAgICAgICAgJCh0aGlzKS5maW5kKCcuJyArIGNvbmYuZXJyb3JNZXNzYWdlQ2xhc3MgKyAnLmFsZXJ0JykucmVtb3ZlKCk7XG4gICAgICAgIF9yZW1vdmVFcnJvclN0eWxlKCQodGhpcykuZmluZCgnLicgKyBjb25mLmVycm9yRWxlbWVudENsYXNzICsgJywudmFsaWQnKSwgY29uZik7XG4gICAgICB9KVxuICAgICAgLmFkZENsYXNzKCdoYXMtdmFsaWRhdGlvbi1jYWxsYmFjaycpO1xuXG4gICAgICBpZiAoY29uZi5zaG93SGVscE9uRm9jdXMpIHtcbiAgICAgICAgJGZvcm0uc2hvd0hlbHBPbkZvY3VzKCk7XG4gICAgICB9XG4gICAgICBpZiAoY29uZi5hZGRTdWdnZXN0aW9ucykge1xuICAgICAgICAkZm9ybS5hZGRTdWdnZXN0aW9ucygpO1xuICAgICAgfVxuICAgICAgaWYgKGNvbmYudmFsaWRhdGVPbkJsdXIpIHtcbiAgICAgICAgJGZvcm0udmFsaWRhdGVPbkJsdXIoY29uZi5sYW5ndWFnZSwgY29uZik7XG4gICAgICAgICRmb3JtLmJpbmQoJ2h0bWw1VmFsaWRhdGlvbkF0dHJzRm91bmQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgJGZvcm0udmFsaWRhdGVPbkJsdXIoY29uZi5sYW5ndWFnZSwgY29uZik7XG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgICBpZiAoY29uZi52YWxpZGF0ZU9uRXZlbnQpIHtcbiAgICAgICAgJGZvcm0udmFsaWRhdGVPbkV2ZW50KGNvbmYubGFuZ3VhZ2UsIGNvbmYpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgaWYgKGNvbmYubW9kdWxlcyAhPSAnJykge1xuICAgICAgJC5mb3JtVXRpbHMubG9hZE1vZHVsZXMoY29uZi5tb2R1bGVzLCBmYWxzZSwgZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICh0eXBlb2YgY29uZi5vbk1vZHVsZXNMb2FkZWQgPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgIGNvbmYub25Nb2R1bGVzTG9hZGVkKCk7XG4gICAgICAgIH1cbiAgICAgICAgJHdpbmRvdy50cmlnZ2VyKCd2YWxpZGF0b3JzTG9hZGVkJywgW3R5cGVvZiBjb25mLmZvcm0gPT0gJ3N0cmluZycgPyAkKGNvbmYuZm9ybSkgOiBjb25mLmZvcm0sIGNvbmZdKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfTtcblxuICAvKipcbiAgICogT2JqZWN0IGNvbnRhaW5pbmcgdXRpbGl0eSBtZXRob2RzIGZvciB0aGlzIHBsdWdpblxuICAgKi9cbiAgJC5mb3JtVXRpbHMgPSB7XG5cbiAgICAvKipcbiAgICAgKiBEZWZhdWx0IGNvbmZpZyBmb3IgJCguLi4pLmlzVmFsaWQoKTtcbiAgICAgKi9cbiAgICBkZWZhdWx0Q29uZmlnOiBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBpZ25vcmU6IFtdLCAvLyBOYW1lcyBvZiBpbnB1dHMgbm90IHRvIGJlIHZhbGlkYXRlZCBldmVuIHRob3VnaCBub2RlIGF0dHJpYnV0ZSBjb250YWluaW5nIHRoZSB2YWxpZGF0aW9uIHJ1bGVzIHRlbGxzIHVzIHRvXG4gICAgICAgIGVycm9yRWxlbWVudENsYXNzOiAnZXJyb3InLCAvLyBDbGFzcyB0aGF0IHdpbGwgYmUgcHV0IG9uIGVsZW1lbnRzIHdoaWNoIHZhbHVlIGlzIGludmFsaWRcbiAgICAgICAgYm9yZGVyQ29sb3JPbkVycm9yOiAnI2I5NGE0OCcsIC8vIEJvcmRlciBjb2xvciBvZiBlbGVtZW50cyB3aGljaCB2YWx1ZSBpcyBpbnZhbGlkLCBlbXB0eSBzdHJpbmcgdG8gbm90IGNoYW5nZSBib3JkZXIgY29sb3JcbiAgICAgICAgZXJyb3JNZXNzYWdlQ2xhc3M6ICdmb3JtLWVycm9yJywgLy8gY2xhc3MgbmFtZSBvZiBkaXYgY29udGFpbmluZyBlcnJvciBtZXNzYWdlcyB3aGVuIHZhbGlkYXRpb24gZmFpbHNcbiAgICAgICAgdmFsaWRhdGlvblJ1bGVBdHRyaWJ1dGU6ICdkYXRhLXZhbGlkYXRpb24nLCAvLyBuYW1lIG9mIHRoZSBhdHRyaWJ1dGUgaG9sZGluZyB0aGUgdmFsaWRhdGlvbiBydWxlc1xuICAgICAgICB2YWxpZGF0aW9uRXJyb3JNc2dBdHRyaWJ1dGU6ICdkYXRhLXZhbGlkYXRpb24tZXJyb3ItbXNnJywgLy8gZGVmaW5lIGN1c3RvbSBlcnIgbXNnIGlubGluZSB3aXRoIGVsZW1lbnRcbiAgICAgICAgZXJyb3JNZXNzYWdlUG9zaXRpb246ICdlbGVtZW50JywgLy8gQ2FuIGJlIGVpdGhlciBcInRvcFwiIG9yIFwiZWxlbWVudFwiIG9yIFwiY3VzdG9tXCJcbiAgICAgICAgZXJyb3JNZXNzYWdlVGVtcGxhdGU6IHtcbiAgICAgICAgICBjb250YWluZXI6ICc8ZGl2IGNsYXNzPVwie2Vycm9yTWVzc2FnZUNsYXNzfSBhbGVydCBhbGVydC1kYW5nZXJcIj57bWVzc2FnZXN9PC9kaXY+JyxcbiAgICAgICAgICBtZXNzYWdlczogJzxzdHJvbmc+e2Vycm9yVGl0bGV9PC9zdHJvbmc+PHVsPntmaWVsZHN9PC91bD4nLFxuICAgICAgICAgIGZpZWxkOiAnPGxpPnttc2d9PC9saT4nXG4gICAgICAgIH0sXG4gICAgICAgIGVycm9yTWVzc2FnZUN1c3RvbTogX3RlbXBsYXRlTWVzc2FnZSxcbiAgICAgICAgc2Nyb2xsVG9Ub3BPbkVycm9yOiB0cnVlLFxuICAgICAgICBkYXRlRm9ybWF0OiAneXl5eS1tbS1kZCcsXG4gICAgICAgIGFkZFZhbGlkQ2xhc3NPbkFsbDogZmFsc2UsIC8vIHdoZXRoZXIgb3Igbm90IHRvIGFwcGx5IGNsYXNzPVwidmFsaWRcIiBldmVuIGlmIHRoZSBpbnB1dCB3YXNuJ3QgdmFsaWRhdGVkXG4gICAgICAgIGRlY2ltYWxTZXBhcmF0b3I6ICcuJyxcbiAgICAgICAgaW5wdXRQYXJlbnRDbGFzc09uRXJyb3I6ICdoYXMtZXJyb3InLCAvLyB0d2l0dGVyLWJvb3RzdHJhcCBkZWZhdWx0IGNsYXNzIG5hbWVcbiAgICAgICAgaW5wdXRQYXJlbnRDbGFzc09uU3VjY2VzczogJ2hhcy1zdWNjZXNzJywgLy8gdHdpdHRlci1ib290c3RyYXAgZGVmYXVsdCBjbGFzcyBuYW1lXG4gICAgICAgIHZhbGlkYXRlSGlkZGVuSW5wdXRzOiBmYWxzZSwgLy8gd2hldGhlciBvciBub3QgaGlkZGVuIGlucHV0cyBzaG91bGQgYmUgdmFsaWRhdGVkXG4gICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEF2YWlsYWJsZSB2YWxpZGF0b3JzXG4gICAgICovXG4gICAgdmFsaWRhdG9yczoge30sXG5cbiAgICAvKipcbiAgICAgKiBFdmVudHMgdHJpZ2dlcmVkIGJ5IGZvcm0gdmFsaWRhdG9yXG4gICAgICovXG4gICAgX2V2ZW50czoge2xvYWQ6IFtdLCB2YWxpZDogW10sIGludmFsaWQ6IFtdfSxcblxuICAgIC8qKlxuICAgICAqIFNldHRpbmcgdGhpcyBwcm9wZXJ0eSB0byB0cnVlIGR1cmluZyB2YWxpZGF0aW9uIHdpbGxcbiAgICAgKiBzdG9wIGZ1cnRoZXIgdmFsaWRhdGlvbiBmcm9tIHRha2luZyBwbGFjZSBhbmQgZm9ybSB3aWxsXG4gICAgICogbm90IGJlIHNlbnRcbiAgICAgKi9cbiAgICBoYWx0VmFsaWRhdGlvbjogZmFsc2UsXG5cbiAgICAvKipcbiAgICAgKiBUaGlzIHZhcmlhYmxlIHdpbGwgYmUgdHJ1ZSAkLmZuLmlzVmFsaWQoKSBpcyBjYWxsZWRcbiAgICAgKiBhbmQgZmFsc2Ugd2hlbiAkLmZuLnZhbGlkYXRlT25CbHVyIGlzIGNhbGxlZFxuICAgICAqL1xuICAgIGlzVmFsaWRhdGluZ0VudGlyZUZvcm06IGZhbHNlLFxuXG4gICAgLyoqXG4gICAgICogRnVuY3Rpb24gZm9yIGFkZGluZyBhIHZhbGlkYXRvclxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSB2YWxpZGF0b3JcbiAgICAgKi9cbiAgICBhZGRWYWxpZGF0b3I6IGZ1bmN0aW9uICh2YWxpZGF0b3IpIHtcbiAgICAgIC8vIHByZWZpeCB3aXRoIFwidmFsaWRhdGVfXCIgZm9yIGJhY2t3YXJkIGNvbXBhdGliaWxpdHkgcmVhc29uc1xuICAgICAgdmFyIG5hbWUgPSB2YWxpZGF0b3IubmFtZS5pbmRleE9mKCd2YWxpZGF0ZV8nKSA9PT0gMCA/IHZhbGlkYXRvci5uYW1lIDogJ3ZhbGlkYXRlXycgKyB2YWxpZGF0b3IubmFtZTtcbiAgICAgIGlmICh2YWxpZGF0b3IudmFsaWRhdGVPbktleVVwID09PSB1bmRlZmluZWQpXG4gICAgICAgIHZhbGlkYXRvci52YWxpZGF0ZU9uS2V5VXAgPSB0cnVlO1xuICAgICAgdGhpcy52YWxpZGF0b3JzW25hbWVdID0gdmFsaWRhdG9yO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBAdmFyIHtCb29sZWFufVxuICAgICAqL1xuICAgIGlzTG9hZGluZ01vZHVsZXM6IGZhbHNlLFxuXG4gICAgLyoqXG4gICAgICogQHZhciB7T2JqZWN0fVxuICAgICAqL1xuICAgIGxvYWRlZE1vZHVsZXM6IHt9LFxuXG4gICAgLyoqXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiAgJC5mb3JtVXRpbHMubG9hZE1vZHVsZXMoJ2RhdGUsIHNlY3VyaXR5LmRldicpO1xuICAgICAqXG4gICAgICogV2lsbCBsb2FkIHRoZSBzY3JpcHRzIGRhdGUuanMgYW5kIHNlY3VyaXR5LmRldi5qcyBmcm9tIHRoZVxuICAgICAqIGRpcmVjdG9yeSB3aGVyZSB0aGlzIHNjcmlwdCByZXNpZGVzLiBJZiB5b3Ugd2FudCB0byBsb2FkXG4gICAgICogdGhlIG1vZHVsZXMgZnJvbSBhbm90aGVyIGRpcmVjdG9yeSB5b3UgY2FuIHVzZSB0aGVcbiAgICAgKiBwYXRoIGFyZ3VtZW50LlxuICAgICAqXG4gICAgICogVGhlIHNjcmlwdCB3aWxsIGJlIGNhY2hlZCBieSB0aGUgYnJvd3NlciB1bmxlc3MgdGhlIG1vZHVsZVxuICAgICAqIG5hbWUgZW5kcyB3aXRoIC5kZXZcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBtb2R1bGVzIC0gQ29tbWEgc2VwYXJhdGVkIHN0cmluZyB3aXRoIG1vZHVsZSBmaWxlIG5hbWVzIChubyBkaXJlY3Rvcnkgbm9yIGZpbGUgZXh0ZW5zaW9uKVxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBbcGF0aF0gLSBPcHRpb25hbCwgcGF0aCB3aGVyZSB0aGUgbW9kdWxlIGZpbGVzIGlzIGxvY2F0ZWQgaWYgdGhlaXIgbm90IGluIHRoZSBzYW1lIGRpcmVjdG9yeSBhcyB0aGUgY29yZSBtb2R1bGVzXG4gICAgICogQHBhcmFtIHtCb29sZWFufGZ1bmN0aW9ufSBbZmlyZUV2ZW50XSAtIE9wdGlvbmFsLCB3aGV0aGVyIG9yIG5vdCB0byBmaXJlIGV2ZW50ICdsb2FkJyB3aGVuIG1vZHVsZXMgZmluaXNoZWQgbG9hZGluZ1xuICAgICAqL1xuICAgIGxvYWRNb2R1bGVzOiBmdW5jdGlvbiAobW9kdWxlcywgcGF0aCwgZmlyZUV2ZW50KSB7XG5cbiAgICAgIGlmIChmaXJlRXZlbnQgPT09IHVuZGVmaW5lZClcbiAgICAgICAgZmlyZUV2ZW50ID0gdHJ1ZTtcblxuICAgICAgaWYgKCQuZm9ybVV0aWxzLmlzTG9hZGluZ01vZHVsZXMpIHtcbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgJC5mb3JtVXRpbHMubG9hZE1vZHVsZXMobW9kdWxlcywgcGF0aCwgZmlyZUV2ZW50KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdmFyIGhhc0xvYWRlZEFueU1vZHVsZSA9IGZhbHNlLFxuICAgICAgICBsb2FkTW9kdWxlU2NyaXB0cyA9IGZ1bmN0aW9uIChtb2R1bGVzLCBwYXRoKSB7XG5cbiAgICAgICAgICB2YXIgbW9kdWxlTGlzdCA9ICQuc3BsaXQobW9kdWxlcyksXG4gICAgICAgICAgICBudW1Nb2R1bGVzID0gbW9kdWxlTGlzdC5sZW5ndGgsXG4gICAgICAgICAgICBtb2R1bGVMb2FkZWRDYWxsYmFjayA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgbnVtTW9kdWxlcy0tO1xuICAgICAgICAgICAgICBpZiAobnVtTW9kdWxlcyA9PSAwKSB7XG4gICAgICAgICAgICAgICAgJC5mb3JtVXRpbHMuaXNMb2FkaW5nTW9kdWxlcyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIGlmIChmaXJlRXZlbnQgJiYgaGFzTG9hZGVkQW55TW9kdWxlKSB7XG4gICAgICAgICAgICAgICAgICBpZiggdHlwZW9mIGZpcmVFdmVudCA9PSAnZnVuY3Rpb24nICkge1xuICAgICAgICAgICAgICAgICAgICBmaXJlRXZlbnQoKTtcbiAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICR3aW5kb3cudHJpZ2dlcigndmFsaWRhdG9yc0xvYWRlZCcpO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcblxuXG4gICAgICAgICAgaWYgKG51bU1vZHVsZXMgPiAwKSB7XG4gICAgICAgICAgICAkLmZvcm1VdGlscy5pc0xvYWRpbmdNb2R1bGVzID0gdHJ1ZTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICB2YXIgY2FjaGVTdWZmaXggPSAnP189JyArICggbmV3IERhdGUoKS5nZXRUaW1lKCkgKSxcbiAgICAgICAgICAgIGFwcGVuZFRvRWxlbWVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdoZWFkJylbMF0gfHwgZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2JvZHknKVswXTtcblxuICAgICAgICAgICQuZWFjaChtb2R1bGVMaXN0LCBmdW5jdGlvbiAoaSwgbW9kTmFtZSkge1xuICAgICAgICAgICAgbW9kTmFtZSA9ICQudHJpbShtb2ROYW1lKTtcbiAgICAgICAgICAgIGlmIChtb2ROYW1lLmxlbmd0aCA9PSAwKSB7XG4gICAgICAgICAgICAgIG1vZHVsZUxvYWRlZENhbGxiYWNrKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgdmFyIHNjcmlwdFVybCA9IHBhdGggKyBtb2ROYW1lICsgKG1vZE5hbWUuc2xpY2UoLTMpID09ICcuanMnID8gJycgOiAnLmpzJyksXG4gICAgICAgICAgICAgICAgc2NyaXB0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnU0NSSVBUJyk7XG5cbiAgICAgICAgICAgICAgaWYgKHNjcmlwdFVybCBpbiAkLmZvcm1VdGlscy5sb2FkZWRNb2R1bGVzKSB7XG4gICAgICAgICAgICAgICAgLy8gYWxyZWFkeSBsb2FkZWRcbiAgICAgICAgICAgICAgICBtb2R1bGVMb2FkZWRDYWxsYmFjaygpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGVsc2Uge1xuXG4gICAgICAgICAgICAgICAgLy8gUmVtZW1iZXIgdGhhdCB0aGlzIHNjcmlwdCBpcyBsb2FkZWRcbiAgICAgICAgICAgICAgICAkLmZvcm1VdGlscy5sb2FkZWRNb2R1bGVzW3NjcmlwdFVybF0gPSAxO1xuICAgICAgICAgICAgICAgIGhhc0xvYWRlZEFueU1vZHVsZSA9IHRydWU7XG5cbiAgICAgICAgICAgICAgICAvLyBMb2FkIHRoZSBzY3JpcHRcbiAgICAgICAgICAgICAgICBzY3JpcHQudHlwZSA9ICd0ZXh0L2phdmFzY3JpcHQnO1xuICAgICAgICAgICAgICAgIHNjcmlwdC5vbmxvYWQgPSBtb2R1bGVMb2FkZWRDYWxsYmFjaztcbiAgICAgICAgICAgICAgICBzY3JpcHQuc3JjID0gc2NyaXB0VXJsICsgKCBzY3JpcHRVcmwuc2xpY2UoLTcpID09ICcuZGV2LmpzJyA/IGNhY2hlU3VmZml4IDogJycgKTtcbiAgICAgICAgICAgICAgICBzY3JpcHQub25lcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgaWYoICdjb25zb2xlJyBpbiB3aW5kb3cgJiYgd2luZG93LmNvbnNvbGUubG9nICkge1xuICAgICAgICAgICAgICAgICAgICB3aW5kb3cuY29uc29sZS5sb2coJ1VuYWJsZSB0byBsb2FkIGZvcm0gdmFsaWRhdGlvbiBtb2R1bGUgJytzY3JpcHRVcmwpO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgc2NyaXB0Lm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgIC8vIElFIDcgZml4XG4gICAgICAgICAgICAgICAgICBpZiAodGhpcy5yZWFkeVN0YXRlID09ICdjb21wbGV0ZScgfHwgdGhpcy5yZWFkeVN0YXRlID09ICdsb2FkZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgIG1vZHVsZUxvYWRlZENhbGxiYWNrKCk7XG4gICAgICAgICAgICAgICAgICAgIC8vIEhhbmRsZSBtZW1vcnkgbGVhayBpbiBJRVxuICAgICAgICAgICAgICAgICAgICB0aGlzLm9ubG9hZCA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMub25yZWFkeXN0YXRlY2hhbmdlID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIGFwcGVuZFRvRWxlbWVudC5hcHBlbmRDaGlsZChzY3JpcHQpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgIGlmIChwYXRoKSB7XG4gICAgICAgIGxvYWRNb2R1bGVTY3JpcHRzKG1vZHVsZXMsIHBhdGgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIGZpbmRTY3JpcHRQYXRoQW5kTG9hZE1vZHVsZXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgdmFyIGZvdW5kUGF0aCA9IGZhbHNlO1xuICAgICAgICAgICQoJ3NjcmlwdFtzcmMqPVwiZm9ybS12YWxpZGF0b3JcIl0nKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGZvdW5kUGF0aCA9IHRoaXMuc3JjLnN1YnN0cigwLCB0aGlzLnNyYy5sYXN0SW5kZXhPZignLycpKSArICcvJztcbiAgICAgICAgICAgIGlmIChmb3VuZFBhdGggPT0gJy8nKVxuICAgICAgICAgICAgICBmb3VuZFBhdGggPSAnJztcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIGlmIChmb3VuZFBhdGggIT09IGZhbHNlKSB7XG4gICAgICAgICAgICBsb2FkTW9kdWxlU2NyaXB0cyhtb2R1bGVzLCBmb3VuZFBhdGgpO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfTtcblxuICAgICAgICBpZiAoIWZpbmRTY3JpcHRQYXRoQW5kTG9hZE1vZHVsZXMoKSkge1xuICAgICAgICAgICQoZmluZFNjcmlwdFBhdGhBbmRMb2FkTW9kdWxlcyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGUgdGhlIHZhbHVlIG9mIGdpdmVuIGVsZW1lbnQgYWNjb3JkaW5nIHRvIHRoZSB2YWxpZGF0aW9uIHJ1bGVzXG4gICAgICogZm91bmQgaW4gdGhlIGF0dHJpYnV0ZSBkYXRhLXZhbGlkYXRpb24uIFdpbGwgcmV0dXJuIGFuIG9iamVjdCByZXByZXNlbnRpbmdcbiAgICAgKiBhIHZhbGlkYXRpb24gcmVzdWx0LCBoYXZpbmcgdGhlIHByb3BzIHNob3VsZENoYW5nZURpc3BsYXksIGlzVmFsaWQgYW5kIGVycm9yTXNnXG4gICAgICogQHBhcmFtIHtqUXVlcnl9ICRlbGVtXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGxhbmd1YWdlICgkLmZvcm1VdGlscy5MQU5HKVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBjb25mXG4gICAgICogQHBhcmFtIHtqUXVlcnl9ICRmb3JtXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IFtldmVudENvbnRleHRdXG4gICAgICogQHJldHVybiB7T2JqZWN0fVxuICAgICAqL1xuICAgIHZhbGlkYXRlSW5wdXQ6IGZ1bmN0aW9uICgkZWxlbSwgbGFuZ3VhZ2UsIGNvbmYsICRmb3JtLCBldmVudENvbnRleHQpIHtcblxuICAgICAgJGVsZW0udHJpZ2dlcignYmVmb3JlVmFsaWRhdGlvbicpO1xuICAgICAgY29uZiA9IGNvbmYgfHwgJC5mb3JtVXRpbHMuZGVmYXVsdENvbmZpZygpO1xuICAgICAgbGFuZ3VhZ2UgPSBsYW5ndWFnZSB8fCAkLmZvcm1VdGlscy5MQU5HO1xuXG4gICAgICB2YXIgdmFsdWUgPSAkZWxlbS52YWwoKSB8fCAnJyxcbiAgICAgICAgICByZXN1bHQgPSB7aXNWYWxpZDogdHJ1ZSwgc2hvdWxkQ2hhbmdlRGlzcGxheTp0cnVlLCBlcnJvck1zZzonJ30sXG4gICAgICAgICAgb3B0aW9uYWwgPSAkZWxlbS52YWxBdHRyKCdvcHRpb25hbCcpLFxuXG4gICAgICAgICAgLy8gdGVzdCBpZiBhIGNoZWNrYm94IGZvcmNlcyB0aGlzIGVsZW1lbnQgdG8gYmUgdmFsaWRhdGVkXG4gICAgICAgICAgdmFsaWRhdGlvbkRlcGVuZHNPbkNoZWNrZWRJbnB1dCA9IGZhbHNlLFxuICAgICAgICAgIHZhbGlkYXRpb25EZXBlbmRlbnRJbnB1dElzQ2hlY2tlZCA9IGZhbHNlLFxuICAgICAgICAgIHZhbGlkYXRlSWZDaGVja2VkRWxlbWVudCA9IGZhbHNlLFxuXG4gICAgICAgICAgLy8gZ2V0IHZhbHVlIG9mIHRoaXMgZWxlbWVudCdzIGF0dHJpYnV0ZSBcIi4uLiBpZi1jaGVja2VkXCJcbiAgICAgICAgICB2YWxpZGF0ZUlmQ2hlY2tlZEVsZW1lbnROYW1lID0gJGVsZW0udmFsQXR0cignaWYtY2hlY2tlZCcpO1xuXG4gICAgICBpZiAoJGVsZW0uYXR0cignZGlzYWJsZWQnKSB8fCAoISRlbGVtLmlzKCc6dmlzaWJsZScpICYmICFjb25mLnZhbGlkYXRlSGlkZGVuSW5wdXRzKSkge1xuICAgICAgICByZXN1bHQuc2hvdWxkQ2hhbmdlRGlzcGxheSA9IGZhbHNlO1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgfVxuXG4gICAgICAvLyBtYWtlIHN1cmUgd2UgY2FuIHByb2NlZWRcbiAgICAgIGlmICh2YWxpZGF0ZUlmQ2hlY2tlZEVsZW1lbnROYW1lICE9IG51bGwpIHtcblxuICAgICAgICAvLyBTZXQgdGhlIGJvb2xlYW4gdGVsbGluZyB1cyB0aGF0IHRoZSB2YWxpZGF0aW9uIGRlcGVuZHNcbiAgICAgICAgLy8gb24gYW5vdGhlciBpbnB1dCBiZWluZyBjaGVja2VkXG4gICAgICAgIHZhbGlkYXRpb25EZXBlbmRzT25DaGVja2VkSW5wdXQgPSB0cnVlO1xuXG4gICAgICAgIC8vIHNlbGVjdCB0aGUgY2hlY2tib3ggdHlwZSBlbGVtZW50IGluIHRoaXMgZm9ybVxuICAgICAgICB2YWxpZGF0ZUlmQ2hlY2tlZEVsZW1lbnQgPSAkZm9ybS5maW5kKCdpbnB1dFtuYW1lPVwiJyArIHZhbGlkYXRlSWZDaGVja2VkRWxlbWVudE5hbWUgKyAnXCJdJyk7XG5cbiAgICAgICAgLy8gdGVzdCBpZiBpdCdzIHByb3BlcnR5IFwiY2hlY2tlZFwiIGlzIGNoZWNrZWRcbiAgICAgICAgaWYgKHZhbGlkYXRlSWZDaGVja2VkRWxlbWVudC5wcm9wKCdjaGVja2VkJykpIHtcbiAgICAgICAgICAvLyBzZXQgdmFsdWUgZm9yIHZhbGlkYXRpb24gY2hlY2twb2ludFxuICAgICAgICAgIHZhbGlkYXRpb25EZXBlbmRlbnRJbnB1dElzQ2hlY2tlZCA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gdmFsaWRhdGlvbiBjaGVja3BvaW50XG4gICAgICAvLyBpZiBlbXB0eSBBTkQgb3B0aW9uYWwgYXR0cmlidXRlIGlzIHByZXNlbnRcbiAgICAgIC8vIE9SIGRlcGVuZGluZyBvbiBhIGNoZWNrYm94IGJlaW5nIGNoZWNrZWQgQU5EIGNoZWNrYm94IGlzIGNoZWNrZWQsIHJldHVybiB0cnVlXG4gICAgICB2YXIgaXNJbnZhbGlkTnVtYmVySW5wdXQgPSAhdmFsdWUgJiYgJGVsZW1bMF0udHlwZSA9PSAnbnVtYmVyJztcbiAgICAgIGlmICgoIXZhbHVlICYmIG9wdGlvbmFsID09PSAndHJ1ZScgJiYgIWlzSW52YWxpZE51bWJlcklucHV0KSB8fCAodmFsaWRhdGlvbkRlcGVuZHNPbkNoZWNrZWRJbnB1dCAmJiAhdmFsaWRhdGlvbkRlcGVuZGVudElucHV0SXNDaGVja2VkKSkge1xuICAgICAgICByZXN1bHQuc2hvdWxkQ2hhbmdlRGlzcGxheSA9IGNvbmYuYWRkVmFsaWRDbGFzc09uQWxsO1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgfVxuXG4gICAgICB2YXIgdmFsaWRhdGlvblJ1bGVzID0gJGVsZW0uYXR0cihjb25mLnZhbGlkYXRpb25SdWxlQXR0cmlidXRlKSxcblxuICAgICAgICAvLyBzZWUgaWYgZm9ybSBlbGVtZW50IGhhcyBpbmxpbmUgZXJyIG1zZyBhdHRyaWJ1dGVcbiAgICAgICAgdmFsaWRhdGlvbkVycm9yTXNnID0gdHJ1ZTtcblxuICAgICAgaWYgKCF2YWxpZGF0aW9uUnVsZXMpIHtcbiAgICAgICAgcmVzdWx0LnNob3VsZENoYW5nZURpc3BsYXkgPSBjb25mLmFkZFZhbGlkQ2xhc3NPbkFsbDtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgIH1cblxuICAgICAgJC5zcGxpdCh2YWxpZGF0aW9uUnVsZXMsIGZ1bmN0aW9uIChydWxlKSB7XG4gICAgICAgIGlmIChydWxlLmluZGV4T2YoJ3ZhbGlkYXRlXycpICE9PSAwKSB7XG4gICAgICAgICAgcnVsZSA9ICd2YWxpZGF0ZV8nICsgcnVsZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciB2YWxpZGF0b3IgPSAkLmZvcm1VdGlscy52YWxpZGF0b3JzW3J1bGVdO1xuXG4gICAgICAgIGlmICh2YWxpZGF0b3IgJiYgdHlwZW9mIHZhbGlkYXRvclsndmFsaWRhdG9yRnVuY3Rpb24nXSA9PSAnZnVuY3Rpb24nKSB7XG5cbiAgICAgICAgICAvLyBzcGVjaWFsIGNoYW5nZSBvZiBlbGVtZW50IGZvciBjaGVja2JveF9ncm91cCBydWxlXG4gICAgICAgICAgaWYgKHJ1bGUgPT0gJ3ZhbGlkYXRlX2NoZWNrYm94X2dyb3VwJykge1xuICAgICAgICAgICAgLy8gc2V0IGVsZW1lbnQgdG8gZmlyc3QgaW4gZ3JvdXAsIHNvIGVycm9yIG1zZyBhdHRyIGRvZXNuJ3QgbmVlZCB0byBiZSBzZXQgb24gYWxsIGVsZW1lbnRzIGluIGdyb3VwXG4gICAgICAgICAgICAkZWxlbSA9ICRmb3JtLmZpbmQoXCJbbmFtZT0nXCIgKyAkZWxlbS5hdHRyKCduYW1lJykgKyBcIiddOmVxKDApXCIpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHZhciBpc1ZhbGlkID0gbnVsbDtcbiAgICAgICAgICBpZiAoZXZlbnRDb250ZXh0ICE9ICdrZXl1cCcgfHwgdmFsaWRhdG9yLnZhbGlkYXRlT25LZXlVcCkge1xuICAgICAgICAgICAgaXNWYWxpZCA9IHZhbGlkYXRvci52YWxpZGF0b3JGdW5jdGlvbih2YWx1ZSwgJGVsZW0sIGNvbmYsIGxhbmd1YWdlLCAkZm9ybSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKCFpc1ZhbGlkKSB7XG4gICAgICAgICAgICB2YWxpZGF0aW9uRXJyb3JNc2cgPSBudWxsO1xuICAgICAgICAgICAgaWYgKGlzVmFsaWQgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgdmFsaWRhdGlvbkVycm9yTXNnID0gJGVsZW0uYXR0cihjb25mLnZhbGlkYXRpb25FcnJvck1zZ0F0dHJpYnV0ZSArICctJyArIHJ1bGUucmVwbGFjZSgndmFsaWRhdGVfJywgJycpKTtcbiAgICAgICAgICAgICAgaWYgKCF2YWxpZGF0aW9uRXJyb3JNc2cpIHtcbiAgICAgICAgICAgICAgICB2YWxpZGF0aW9uRXJyb3JNc2cgPSAkZWxlbS5hdHRyKGNvbmYudmFsaWRhdGlvbkVycm9yTXNnQXR0cmlidXRlKTtcbiAgICAgICAgICAgICAgICBpZiAoIXZhbGlkYXRpb25FcnJvck1zZykge1xuICAgICAgICAgICAgICAgICAgdmFsaWRhdGlvbkVycm9yTXNnID0gbGFuZ3VhZ2VbdmFsaWRhdG9yLmVycm9yTWVzc2FnZUtleV07XG4gICAgICAgICAgICAgICAgICBpZiAoIXZhbGlkYXRpb25FcnJvck1zZylcbiAgICAgICAgICAgICAgICAgICAgdmFsaWRhdGlvbkVycm9yTXNnID0gdmFsaWRhdG9yLmVycm9yTWVzc2FnZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTsgLy8gYnJlYWsgaXRlcmF0aW9uXG4gICAgICAgICAgfVxuXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVc2luZyB1bmRlZmluZWQgdmFsaWRhdG9yIFwiJyArIHJ1bGUgKyAnXCInKTtcbiAgICAgICAgfVxuXG4gICAgICB9LCAnICcpO1xuXG4gICAgICBpZiAodHlwZW9mIHZhbGlkYXRpb25FcnJvck1zZyA9PSAnc3RyaW5nJykge1xuICAgICAgICAkZWxlbS50cmlnZ2VyKCd2YWxpZGF0aW9uJywgZmFsc2UpO1xuICAgICAgICByZXN1bHQuZXJyb3JNc2cgPSB2YWxpZGF0aW9uRXJyb3JNc2c7XG4gICAgICAgIHJlc3VsdC5pc1ZhbGlkID0gZmFsc2U7XG4gICAgICAgIHJlc3VsdC5zaG91bGRDaGFuZ2VEaXNwbGF5ID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSBpZiAodmFsaWRhdGlvbkVycm9yTXNnID09PSBudWxsKSB7XG4gICAgICAgIHJlc3VsdC5zaG91bGRDaGFuZ2VEaXNwbGF5ID0gY29uZi5hZGRWYWxpZENsYXNzT25BbGw7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAkZWxlbS50cmlnZ2VyKCd2YWxpZGF0aW9uJywgdHJ1ZSk7XG4gICAgICAgIHJlc3VsdC5zaG91bGRDaGFuZ2VEaXNwbGF5ID0gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgLy8gUnVuIGVsZW1lbnQgdmFsaWRhdGlvbiBjYWxsYmFja1xuICAgICAgaWYgKHR5cGVvZiBjb25mLm9uRWxlbWVudFZhbGlkYXRlID09ICdmdW5jdGlvbicgJiYgdmFsaWRhdGlvbkVycm9yTXNnICE9PSBudWxsKSB7XG4gICAgICAgIGNvbmYub25FbGVtZW50VmFsaWRhdGUocmVzdWx0LmlzVmFsaWQsICRlbGVtLCAkZm9ybSwgdmFsaWRhdGlvbkVycm9yTXNnKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSXMgaXQgYSBjb3JyZWN0IGRhdGUgYWNjb3JkaW5nIHRvIGdpdmVuIGRhdGVGb3JtYXQuIFdpbGwgcmV0dXJuIGZhbHNlIGlmIG5vdCwgb3RoZXJ3aXNlXG4gICAgICogYW4gYXJyYXkgMD0+eWVhciAxPT5tb250aCAyPT5kYXlcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSB2YWxcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gZGF0ZUZvcm1hdFxuICAgICAqIEByZXR1cm4ge0FycmF5fXx7Qm9vbGVhbn1cbiAgICAgKi9cbiAgICBwYXJzZURhdGU6IGZ1bmN0aW9uICh2YWwsIGRhdGVGb3JtYXQpIHtcbiAgICAgIHZhciBkaXZpZGVyID0gZGF0ZUZvcm1hdC5yZXBsYWNlKC9bYS16QS1aXS9naSwgJycpLnN1YnN0cmluZygwLCAxKSxcbiAgICAgICAgcmVnZXhwID0gJ14nLFxuICAgICAgICBmb3JtYXRQYXJ0cyA9IGRhdGVGb3JtYXQuc3BsaXQoZGl2aWRlciB8fCBudWxsKSxcbiAgICAgICAgbWF0Y2hlcywgZGF5LCBtb250aCwgeWVhcjtcblxuICAgICAgJC5lYWNoKGZvcm1hdFBhcnRzLCBmdW5jdGlvbiAoaSwgcGFydCkge1xuICAgICAgICByZWdleHAgKz0gKGkgPiAwID8gJ1xcXFwnICsgZGl2aWRlciA6ICcnKSArICcoXFxcXGR7JyArIHBhcnQubGVuZ3RoICsgJ30pJztcbiAgICAgIH0pO1xuXG4gICAgICByZWdleHAgKz0gJyQnO1xuXG4gICAgICBtYXRjaGVzID0gdmFsLm1hdGNoKG5ldyBSZWdFeHAocmVnZXhwKSk7XG4gICAgICBpZiAobWF0Y2hlcyA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG5cbiAgICAgIHZhciBmaW5kRGF0ZVVuaXQgPSBmdW5jdGlvbiAodW5pdCwgZm9ybWF0UGFydHMsIG1hdGNoZXMpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBmb3JtYXRQYXJ0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIGlmIChmb3JtYXRQYXJ0c1tpXS5zdWJzdHJpbmcoMCwgMSkgPT09IHVuaXQpIHtcbiAgICAgICAgICAgIHJldHVybiAkLmZvcm1VdGlscy5wYXJzZURhdGVJbnQobWF0Y2hlc1tpICsgMV0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gLTE7XG4gICAgICB9O1xuXG4gICAgICBtb250aCA9IGZpbmREYXRlVW5pdCgnbScsIGZvcm1hdFBhcnRzLCBtYXRjaGVzKTtcbiAgICAgIGRheSA9IGZpbmREYXRlVW5pdCgnZCcsIGZvcm1hdFBhcnRzLCBtYXRjaGVzKTtcbiAgICAgIHllYXIgPSBmaW5kRGF0ZVVuaXQoJ3knLCBmb3JtYXRQYXJ0cywgbWF0Y2hlcyk7XG5cbiAgICAgIGlmICgobW9udGggPT09IDIgJiYgZGF5ID4gMjggJiYgKHllYXIgJSA0ICE9PSAwIHx8IHllYXIgJSAxMDAgPT09IDAgJiYgeWVhciAlIDQwMCAhPT0gMCkpXG4gICAgICAgIHx8IChtb250aCA9PT0gMiAmJiBkYXkgPiAyOSAmJiAoeWVhciAlIDQgPT09IDAgfHwgeWVhciAlIDEwMCAhPT0gMCAmJiB5ZWFyICUgNDAwID09PSAwKSlcbiAgICAgICAgfHwgbW9udGggPiAxMiB8fCBtb250aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICBpZiAoKHRoaXMuaXNTaG9ydE1vbnRoKG1vbnRoKSAmJiBkYXkgPiAzMCkgfHwgKCF0aGlzLmlzU2hvcnRNb250aChtb250aCkgJiYgZGF5ID4gMzEpIHx8IGRheSA9PT0gMCkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBbeWVhciwgbW9udGgsIGRheV07XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIHNrdW0gZml4LiDDpHIgdGFsZXQgMDUgZWxsZXIgbMOkZ3JlIGdlciBwYXJzZUludCByw6R0dCBpbnQgYW5uYXJzIGbDpXIgbWFuIDAgbsOkciBtYW4ga8O2ciBwYXJzZUludD9cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSB2YWxcbiAgICAgKiBAcGFyYW0ge051bWJlcn1cbiAgICAgKi9cbiAgICBwYXJzZURhdGVJbnQ6IGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgIGlmICh2YWwuaW5kZXhPZignMCcpID09PSAwKSB7XG4gICAgICAgIHZhbCA9IHZhbC5yZXBsYWNlKCcwJywgJycpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHBhcnNlSW50KHZhbCwgMTApO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIYXMgbW9udGggb25seSAzMCBkYXlzP1xuICAgICAqXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IG1cbiAgICAgKiBAcmV0dXJuIHtCb29sZWFufVxuICAgICAqL1xuICAgIGlzU2hvcnRNb250aDogZnVuY3Rpb24gKG0pIHtcbiAgICAgIHJldHVybiAobSAlIDIgPT09IDAgJiYgbSA8IDcpIHx8IChtICUgMiAhPT0gMCAmJiBtID4gNyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlc3RyaWN0IGlucHV0IGxlbmd0aFxuICAgICAqXG4gICAgICogQHBhcmFtIHtqUXVlcnl9ICRpbnB1dEVsZW1lbnQgSnF1ZXJ5IEh0bWwgb2JqZWN0XG4gICAgICogQHBhcmFtIHtqUXVlcnl9ICRtYXhMZW5ndGhFbGVtZW50IGpRdWVyeSBIdG1sIE9iamVjdFxuICAgICAqIEByZXR1cm4gdm9pZFxuICAgICAqL1xuICAgIGxlbmd0aFJlc3RyaWN0aW9uOiBmdW5jdGlvbiAoJGlucHV0RWxlbWVudCwgJG1heExlbmd0aEVsZW1lbnQpIHtcbiAgICAgIC8vIHJlYWQgbWF4Q2hhcnMgZnJvbSBjb3VudGVyIGRpc3BsYXkgaW5pdGlhbCB0ZXh0IHZhbHVlXG4gICAgICB2YXIgbWF4Q2hhcnMgPSBwYXJzZUludCgkbWF4TGVuZ3RoRWxlbWVudC50ZXh0KCksIDEwKSxcbiAgICAgICAgY2hhcnNMZWZ0ID0gMCxcblxuICAgICAgLy8gaW50ZXJuYWwgZnVuY3Rpb24gZG9lcyB0aGUgY291bnRpbmcgYW5kIHNldHMgZGlzcGxheSB2YWx1ZVxuICAgICAgICBjb3VudENoYXJhY3RlcnMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgdmFyIG51bUNoYXJzID0gJGlucHV0RWxlbWVudC52YWwoKS5sZW5ndGg7XG4gICAgICAgICAgaWYgKG51bUNoYXJzID4gbWF4Q2hhcnMpIHtcbiAgICAgICAgICAgIC8vIGdldCBjdXJyZW50IHNjcm9sbCBiYXIgcG9zaXRpb25cbiAgICAgICAgICAgIHZhciBjdXJyU2Nyb2xsVG9wUG9zID0gJGlucHV0RWxlbWVudC5zY3JvbGxUb3AoKTtcbiAgICAgICAgICAgIC8vIHRyaW0gdmFsdWUgdG8gbWF4IGxlbmd0aFxuICAgICAgICAgICAgJGlucHV0RWxlbWVudC52YWwoJGlucHV0RWxlbWVudC52YWwoKS5zdWJzdHJpbmcoMCwgbWF4Q2hhcnMpKTtcbiAgICAgICAgICAgICRpbnB1dEVsZW1lbnQuc2Nyb2xsVG9wKGN1cnJTY3JvbGxUb3BQb3MpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjaGFyc0xlZnQgPSBtYXhDaGFycyAtIG51bUNoYXJzO1xuICAgICAgICAgIGlmIChjaGFyc0xlZnQgPCAwKVxuICAgICAgICAgICAgY2hhcnNMZWZ0ID0gMDtcblxuICAgICAgICAgIC8vIHNldCBjb3VudGVyIHRleHRcbiAgICAgICAgICAkbWF4TGVuZ3RoRWxlbWVudC50ZXh0KGNoYXJzTGVmdCk7XG4gICAgICAgIH07XG5cbiAgICAgIC8vIGJpbmQgZXZlbnRzIHRvIHRoaXMgZWxlbWVudFxuICAgICAgLy8gc2V0VGltZW91dCBpcyBuZWVkZWQsIGN1dCBvciBwYXN0ZSBmaXJlcyBiZWZvcmUgdmFsIGlzIGF2YWlsYWJsZVxuICAgICAgJCgkaW5wdXRFbGVtZW50KS5iaW5kKCdrZXlkb3duIGtleXVwIGtleXByZXNzIGZvY3VzIGJsdXInLCBjb3VudENoYXJhY3RlcnMpXG4gICAgICAgIC5iaW5kKCdjdXQgcGFzdGUnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgc2V0VGltZW91dChjb3VudENoYXJhY3RlcnMsIDEwMCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAvLyBjb3VudCBjaGFycyBvbiBwYWdlbG9hZCwgaWYgdGhlcmUgYXJlIHByZWZpbGxlZCBpbnB1dC12YWx1ZXNcbiAgICAgICQoZG9jdW1lbnQpLmJpbmQoXCJyZWFkeVwiLCBjb3VudENoYXJhY3RlcnMpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBUZXN0IG51bWVyaWMgYWdhaW5zdCBhbGxvd2VkIHJhbmdlXG4gICAgICpcbiAgICAgKiBAcGFyYW0gJHZhbHVlIGludFxuICAgICAqIEBwYXJhbSAkcmFuZ2VBbGxvd2VkIHN0cjsgKDEtMiwgbWluMSwgbWF4MiwgMTApXG4gICAgICogQHJldHVybiBhcnJheVxuICAgICAqL1xuICAgIG51bWVyaWNSYW5nZUNoZWNrOiBmdW5jdGlvbiAodmFsdWUsIHJhbmdlQWxsb3dlZCkge1xuICAgICAgLy8gc3BsaXQgYnkgZGFzaFxuICAgICAgdmFyIHJhbmdlID0gJC5zcGxpdChyYW5nZUFsbG93ZWQpLFxuICAgICAgICAgIC8vIG1pbiBvciBtYXhcbiAgICAgICAgICBtaW5tYXggPSBwYXJzZUludChyYW5nZUFsbG93ZWQuc3Vic3RyKDMpLCAxMCk7XG5cbiAgICAgIGlmKCByYW5nZS5sZW5ndGggPT0gMSAmJiByYW5nZUFsbG93ZWQuaW5kZXhPZignbWluJykgPT0gLTEgJiYgcmFuZ2VBbGxvd2VkLmluZGV4T2YoJ21heCcpID09IC0xICkge1xuICAgICAgICByYW5nZSA9IFtyYW5nZUFsbG93ZWQsIHJhbmdlQWxsb3dlZF07IC8vIG9ubHkgYSBudW1iZXIsIGNoZWNraW5nIGFnYWlucyBhbiBleGFjdCBudW1iZXIgb2YgY2hhcmFjdGVyc1xuICAgICAgfVxuXG4gICAgICAvLyByYW5nZSA/XG4gICAgICBpZiAocmFuZ2UubGVuZ3RoID09IDIgJiYgKHZhbHVlIDwgcGFyc2VJbnQocmFuZ2VbMF0sIDEwKSB8fCB2YWx1ZSA+IHBhcnNlSW50KHJhbmdlWzFdLCAxMCkgKSkge1xuICAgICAgICByZXR1cm4gWyBcIm91dFwiLCByYW5nZVswXSwgcmFuZ2VbMV0gXTtcbiAgICAgIH0gLy8gdmFsdWUgaXMgb3V0IG9mIHJhbmdlXG4gICAgICBlbHNlIGlmIChyYW5nZUFsbG93ZWQuaW5kZXhPZignbWluJykgPT09IDAgJiYgKHZhbHVlIDwgbWlubWF4ICkpIC8vIG1pblxuICAgICAge1xuICAgICAgICByZXR1cm4gW1wibWluXCIsIG1pbm1heF07XG4gICAgICB9IC8vIHZhbHVlIGlzIGJlbG93IG1pblxuICAgICAgZWxzZSBpZiAocmFuZ2VBbGxvd2VkLmluZGV4T2YoJ21heCcpID09PSAwICYmICh2YWx1ZSA+IG1pbm1heCApKSAvLyBtYXhcbiAgICAgIHtcbiAgICAgICAgcmV0dXJuIFtcIm1heFwiLCBtaW5tYXhdO1xuICAgICAgfSAvLyB2YWx1ZSBpcyBhYm92ZSBtYXhcbiAgICAgIC8vIHNpbmNlIG5vIG90aGVyIHJldHVybnMgZXhlY3V0ZWQsIHZhbHVlIGlzIGluIGFsbG93ZWQgcmFuZ2VcbiAgICAgIHJldHVybiBbIFwib2tcIiBdO1xuICAgIH0sXG5cblxuICAgIF9udW1TdWdnZXN0aW9uRWxlbWVudHM6IDAsXG4gICAgX3NlbGVjdGVkU3VnZ2VzdGlvbjogbnVsbCxcbiAgICBfcHJldmlvdXNUeXBlZFZhbDogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIFV0aWxpdHkgZnVuY3Rpb24gdGhhdCBjYW4gYmUgdXNlZCB0byBjcmVhdGUgcGx1Z2lucyB0aGF0IGdpdmVzXG4gICAgICogc3VnZ2VzdGlvbnMgd2hlbiBpbnB1dHMgaXMgdHlwZWQgaW50b1xuICAgICAqIEBwYXJhbSB7alF1ZXJ5fSAkZWxlbVxuICAgICAqIEBwYXJhbSB7QXJyYXl9IHN1Z2dlc3Rpb25zXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHNldHRpbmdzIC0gT3B0aW9uYWxcbiAgICAgKiBAcmV0dXJuIHtqUXVlcnl9XG4gICAgICovXG4gICAgc3VnZ2VzdDogZnVuY3Rpb24gKCRlbGVtLCBzdWdnZXN0aW9ucywgc2V0dGluZ3MpIHtcbiAgICAgIHZhciBjb25mID0ge1xuICAgICAgICAgIGNzczoge1xuICAgICAgICAgICAgbWF4SGVpZ2h0OiAnMTUwcHgnLFxuICAgICAgICAgICAgYmFja2dyb3VuZDogJyNGRkYnLFxuICAgICAgICAgICAgbGluZUhlaWdodDogJzE1MCUnLFxuICAgICAgICAgICAgdGV4dERlY29yYXRpb246ICd1bmRlcmxpbmUnLFxuICAgICAgICAgICAgb3ZlcmZsb3dYOiAnaGlkZGVuJyxcbiAgICAgICAgICAgIG92ZXJmbG93WTogJ2F1dG8nLFxuICAgICAgICAgICAgYm9yZGVyOiAnI0NDQyBzb2xpZCAxcHgnLFxuICAgICAgICAgICAgYm9yZGVyVG9wOiAnbm9uZScsXG4gICAgICAgICAgICBjdXJzb3I6ICdwb2ludGVyJ1xuICAgICAgICAgIH0sXG4gICAgICAgICAgYWN0aXZlU3VnZ2VzdGlvbkNTUzoge1xuICAgICAgICAgICAgYmFja2dyb3VuZDogJyNFOUU5RTknXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBzZXRTdWdnc2V0aW9uUG9zaXRpb24gPSBmdW5jdGlvbiAoJHN1Z2dlc3Rpb25Db250YWluZXIsICRpbnB1dCkge1xuICAgICAgICAgIHZhciBvZmZzZXQgPSAkaW5wdXQub2Zmc2V0KCk7XG4gICAgICAgICAgJHN1Z2dlc3Rpb25Db250YWluZXIuY3NzKHtcbiAgICAgICAgICAgIHdpZHRoOiAkaW5wdXQub3V0ZXJXaWR0aCgpLFxuICAgICAgICAgICAgbGVmdDogb2Zmc2V0LmxlZnQgKyAncHgnLFxuICAgICAgICAgICAgdG9wOiAob2Zmc2V0LnRvcCArICRpbnB1dC5vdXRlckhlaWdodCgpKSArICdweCdcbiAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgaWYgKHNldHRpbmdzKVxuICAgICAgICAkLmV4dGVuZChjb25mLCBzZXR0aW5ncyk7XG5cbiAgICAgIGNvbmYuY3NzWydwb3NpdGlvbiddID0gJ2Fic29sdXRlJztcbiAgICAgIGNvbmYuY3NzWyd6LWluZGV4J10gPSA5OTk5O1xuICAgICAgJGVsZW0uYXR0cignYXV0b2NvbXBsZXRlJywgJ29mZicpO1xuXG4gICAgICBpZiAodGhpcy5fbnVtU3VnZ2VzdGlvbkVsZW1lbnRzID09PSAwKSB7XG4gICAgICAgIC8vIFJlLXBvc2l0aW9uIHN1Z2dlc3Rpb24gY29udGFpbmVyIGlmIHdpbmRvdyBzaXplIGNoYW5nZXNcbiAgICAgICAgJHdpbmRvdy5iaW5kKCdyZXNpemUnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgJCgnLmpxdWVyeS1mb3JtLXN1Z2dlc3Rpb25zJykuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgJGNvbnRhaW5lciA9ICQodGhpcyksXG4gICAgICAgICAgICAgIHN1Z2dlc3RJRCA9ICRjb250YWluZXIuYXR0cignZGF0YS1zdWdnZXN0LWNvbnRhaW5lcicpO1xuICAgICAgICAgICAgc2V0U3VnZ3NldGlvblBvc2l0aW9uKCRjb250YWluZXIsICQoJy5zdWdnZXN0aW9ucy0nICsgc3VnZ2VzdElEKS5lcSgwKSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICB0aGlzLl9udW1TdWdnZXN0aW9uRWxlbWVudHMrKztcblxuICAgICAgdmFyIG9uU2VsZWN0U3VnZ2VzdGlvbiA9IGZ1bmN0aW9uICgkZWwpIHtcbiAgICAgICAgdmFyIHN1Z2dlc3Rpb25JZCA9ICRlbC52YWxBdHRyKCdzdWdnZXN0aW9uLW5yJyk7XG4gICAgICAgICQuZm9ybVV0aWxzLl9zZWxlY3RlZFN1Z2dlc3Rpb24gPSBudWxsO1xuICAgICAgICAkLmZvcm1VdGlscy5fcHJldmlvdXNUeXBlZFZhbCA9IG51bGw7XG4gICAgICAgICQoJy5qcXVlcnktZm9ybS1zdWdnZXN0aW9uLScgKyBzdWdnZXN0aW9uSWQpLmZhZGVPdXQoJ2Zhc3QnKTtcbiAgICAgIH07XG5cbiAgICAgICRlbGVtXG4gICAgICAgIC5kYXRhKCdzdWdnZXN0aW9ucycsIHN1Z2dlc3Rpb25zKVxuICAgICAgICAudmFsQXR0cignc3VnZ2VzdGlvbi1ucicsIHRoaXMuX251bVN1Z2dlc3Rpb25FbGVtZW50cylcbiAgICAgICAgLnVuYmluZCgnZm9jdXMuc3VnZ2VzdCcpXG4gICAgICAgIC5iaW5kKCdmb2N1cy5zdWdnZXN0JywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICQodGhpcykudHJpZ2dlcigna2V5dXAnKTtcbiAgICAgICAgICAkLmZvcm1VdGlscy5fc2VsZWN0ZWRTdWdnZXN0aW9uID0gbnVsbDtcbiAgICAgICAgfSlcbiAgICAgICAgLnVuYmluZCgna2V5dXAuc3VnZ2VzdCcpXG4gICAgICAgIC5iaW5kKCdrZXl1cC5zdWdnZXN0JywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHZhciAkaW5wdXQgPSAkKHRoaXMpLFxuICAgICAgICAgICAgZm91bmRTdWdnZXN0aW9ucyA9IFtdLFxuICAgICAgICAgICAgdmFsID0gJC50cmltKCRpbnB1dC52YWwoKSkudG9Mb2NhbGVMb3dlckNhc2UoKTtcblxuICAgICAgICAgIGlmICh2YWwgPT0gJC5mb3JtVXRpbHMuX3ByZXZpb3VzVHlwZWRWYWwpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAkLmZvcm1VdGlscy5fcHJldmlvdXNUeXBlZFZhbCA9IHZhbDtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICB2YXIgaGFzVHlwZWRTdWdnZXN0aW9uID0gZmFsc2UsXG4gICAgICAgICAgICBzdWdnZXN0aW9uSWQgPSAkaW5wdXQudmFsQXR0cignc3VnZ2VzdGlvbi1ucicpLFxuICAgICAgICAgICAgJHN1Z2dlc3Rpb25Db250YWluZXIgPSAkKCcuanF1ZXJ5LWZvcm0tc3VnZ2VzdGlvbi0nICsgc3VnZ2VzdGlvbklkKTtcblxuICAgICAgICAgICRzdWdnZXN0aW9uQ29udGFpbmVyLnNjcm9sbFRvcCgwKTtcblxuICAgICAgICAgIC8vIEZpbmQgdGhlIHJpZ2h0IHN1Z2dlc3Rpb25zXG4gICAgICAgICAgaWYgKHZhbCAhPSAnJykge1xuICAgICAgICAgICAgdmFyIGZpbmRQYXJ0aWFsID0gdmFsLmxlbmd0aCA+IDI7XG4gICAgICAgICAgICAkLmVhY2goJGlucHV0LmRhdGEoJ3N1Z2dlc3Rpb25zJyksIGZ1bmN0aW9uIChpLCBzdWdnZXN0aW9uKSB7XG4gICAgICAgICAgICAgIHZhciBsb3dlckNhc2VWYWwgPSBzdWdnZXN0aW9uLnRvTG9jYWxlTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICAgIGlmIChsb3dlckNhc2VWYWwgPT0gdmFsKSB7XG4gICAgICAgICAgICAgICAgZm91bmRTdWdnZXN0aW9ucy5wdXNoKCc8c3Ryb25nPicgKyBzdWdnZXN0aW9uICsgJzwvc3Ryb25nPicpO1xuICAgICAgICAgICAgICAgIGhhc1R5cGVkU3VnZ2VzdGlvbiA9IHRydWU7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICB9IGVsc2UgaWYgKGxvd2VyQ2FzZVZhbC5pbmRleE9mKHZhbCkgPT09IDAgfHwgKGZpbmRQYXJ0aWFsICYmIGxvd2VyQ2FzZVZhbC5pbmRleE9mKHZhbCkgPiAtMSkpIHtcbiAgICAgICAgICAgICAgICBmb3VuZFN1Z2dlc3Rpb25zLnB1c2goc3VnZ2VzdGlvbi5yZXBsYWNlKG5ldyBSZWdFeHAodmFsLCAnZ2knKSwgJzxzdHJvbmc+JCY8L3N0cm9uZz4nKSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIEhpZGUgc3VnZ2VzdGlvbiBjb250YWluZXJcbiAgICAgICAgICBpZiAoaGFzVHlwZWRTdWdnZXN0aW9uIHx8IChmb3VuZFN1Z2dlc3Rpb25zLmxlbmd0aCA9PSAwICYmICRzdWdnZXN0aW9uQ29udGFpbmVyLmxlbmd0aCA+IDApKSB7XG4gICAgICAgICAgICAkc3VnZ2VzdGlvbkNvbnRhaW5lci5oaWRlKCk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gQ3JlYXRlIHN1Z2dlc3Rpb24gY29udGFpbmVyIGlmIG5vdCBhbHJlYWR5IGV4aXN0c1xuICAgICAgICAgIGVsc2UgaWYgKGZvdW5kU3VnZ2VzdGlvbnMubGVuZ3RoID4gMCAmJiAkc3VnZ2VzdGlvbkNvbnRhaW5lci5sZW5ndGggPT0gMCkge1xuICAgICAgICAgICAgJHN1Z2dlc3Rpb25Db250YWluZXIgPSAkKCc8ZGl2PjwvZGl2PicpLmNzcyhjb25mLmNzcykuYXBwZW5kVG8oJ2JvZHknKTtcbiAgICAgICAgICAgICRlbGVtLmFkZENsYXNzKCdzdWdnZXN0aW9ucy0nICsgc3VnZ2VzdGlvbklkKTtcbiAgICAgICAgICAgICRzdWdnZXN0aW9uQ29udGFpbmVyXG4gICAgICAgICAgICAgIC5hdHRyKCdkYXRhLXN1Z2dlc3QtY29udGFpbmVyJywgc3VnZ2VzdGlvbklkKVxuICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ2pxdWVyeS1mb3JtLXN1Z2dlc3Rpb25zJylcbiAgICAgICAgICAgICAgLmFkZENsYXNzKCdqcXVlcnktZm9ybS1zdWdnZXN0aW9uLScgKyBzdWdnZXN0aW9uSWQpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIFNob3cgaGlkZGVuIGNvbnRhaW5lclxuICAgICAgICAgIGVsc2UgaWYgKGZvdW5kU3VnZ2VzdGlvbnMubGVuZ3RoID4gMCAmJiAhJHN1Z2dlc3Rpb25Db250YWluZXIuaXMoJzp2aXNpYmxlJykpIHtcbiAgICAgICAgICAgICRzdWdnZXN0aW9uQ29udGFpbmVyLnNob3coKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBhZGQgc3VnZ2VzdGlvbnNcbiAgICAgICAgICBpZiAoZm91bmRTdWdnZXN0aW9ucy5sZW5ndGggPiAwICYmIHZhbC5sZW5ndGggIT0gZm91bmRTdWdnZXN0aW9uc1swXS5sZW5ndGgpIHtcblxuICAgICAgICAgICAgLy8gcHV0IGNvbnRhaW5lciBpbiBwbGFjZSBldmVyeSB0aW1lLCBqdXN0IGluIGNhc2VcbiAgICAgICAgICAgIHNldFN1Z2dzZXRpb25Qb3NpdGlvbigkc3VnZ2VzdGlvbkNvbnRhaW5lciwgJGlucHV0KTtcblxuICAgICAgICAgICAgLy8gQWRkIHN1Z2dlc3Rpb25zIEhUTUwgdG8gY29udGFpbmVyXG4gICAgICAgICAgICAkc3VnZ2VzdGlvbkNvbnRhaW5lci5odG1sKCcnKTtcbiAgICAgICAgICAgICQuZWFjaChmb3VuZFN1Z2dlc3Rpb25zLCBmdW5jdGlvbiAoaSwgdGV4dCkge1xuICAgICAgICAgICAgICAkKCc8ZGl2PjwvZGl2PicpXG4gICAgICAgICAgICAgICAgLmFwcGVuZCh0ZXh0KVxuICAgICAgICAgICAgICAgIC5jc3Moe1xuICAgICAgICAgICAgICAgICAgb3ZlcmZsb3c6ICdoaWRkZW4nLFxuICAgICAgICAgICAgICAgICAgdGV4dE92ZXJmbG93OiAnZWxsaXBzaXMnLFxuICAgICAgICAgICAgICAgICAgd2hpdGVTcGFjZTogJ25vd3JhcCcsXG4gICAgICAgICAgICAgICAgICBwYWRkaW5nOiAnNXB4J1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLmFkZENsYXNzKCdmb3JtLXN1Z2dlc3QtZWxlbWVudCcpXG4gICAgICAgICAgICAgICAgLmFwcGVuZFRvKCRzdWdnZXN0aW9uQ29udGFpbmVyKVxuICAgICAgICAgICAgICAgIC5jbGljayhmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAkaW5wdXQuZm9jdXMoKTtcbiAgICAgICAgICAgICAgICAgICRpbnB1dC52YWwoJCh0aGlzKS50ZXh0KCkpO1xuICAgICAgICAgICAgICAgICAgb25TZWxlY3RTdWdnZXN0aW9uKCRpbnB1dCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgICAgIC51bmJpbmQoJ2tleWRvd24udmFsaWRhdGlvbicpXG4gICAgICAgIC5iaW5kKCdrZXlkb3duLnZhbGlkYXRpb24nLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgIHZhciBjb2RlID0gKGUua2V5Q29kZSA/IGUua2V5Q29kZSA6IGUud2hpY2gpLFxuICAgICAgICAgICAgc3VnZ2VzdGlvbklkLFxuICAgICAgICAgICAgJHN1Z2dlc3Rpb25Db250YWluZXIsXG4gICAgICAgICAgICAkaW5wdXQgPSAkKHRoaXMpO1xuXG4gICAgICAgICAgaWYgKGNvZGUgPT0gMTMgJiYgJC5mb3JtVXRpbHMuX3NlbGVjdGVkU3VnZ2VzdGlvbiAhPT0gbnVsbCkge1xuICAgICAgICAgICAgc3VnZ2VzdGlvbklkID0gJGlucHV0LnZhbEF0dHIoJ3N1Z2dlc3Rpb24tbnInKTtcbiAgICAgICAgICAgICRzdWdnZXN0aW9uQ29udGFpbmVyID0gJCgnLmpxdWVyeS1mb3JtLXN1Z2dlc3Rpb24tJyArIHN1Z2dlc3Rpb25JZCk7XG4gICAgICAgICAgICBpZiAoJHN1Z2dlc3Rpb25Db250YWluZXIubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICB2YXIgbmV3VGV4dCA9ICRzdWdnZXN0aW9uQ29udGFpbmVyLmZpbmQoJ2RpdicpLmVxKCQuZm9ybVV0aWxzLl9zZWxlY3RlZFN1Z2dlc3Rpb24pLnRleHQoKTtcbiAgICAgICAgICAgICAgJGlucHV0LnZhbChuZXdUZXh0KTtcbiAgICAgICAgICAgICAgb25TZWxlY3RTdWdnZXN0aW9uKCRpbnB1dCk7XG4gICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBzdWdnZXN0aW9uSWQgPSAkaW5wdXQudmFsQXR0cignc3VnZ2VzdGlvbi1ucicpO1xuICAgICAgICAgICAgJHN1Z2dlc3Rpb25Db250YWluZXIgPSAkKCcuanF1ZXJ5LWZvcm0tc3VnZ2VzdGlvbi0nICsgc3VnZ2VzdGlvbklkKTtcbiAgICAgICAgICAgIHZhciAkc3VnZ2VzdGlvbnMgPSAkc3VnZ2VzdGlvbkNvbnRhaW5lci5jaGlsZHJlbigpO1xuICAgICAgICAgICAgaWYgKCRzdWdnZXN0aW9ucy5sZW5ndGggPiAwICYmICQuaW5BcnJheShjb2RlLCBbMzgsIDQwXSkgPiAtMSkge1xuICAgICAgICAgICAgICBpZiAoY29kZSA9PSAzOCkgeyAvLyBrZXkgdXBcbiAgICAgICAgICAgICAgICBpZiAoJC5mb3JtVXRpbHMuX3NlbGVjdGVkU3VnZ2VzdGlvbiA9PT0gbnVsbClcbiAgICAgICAgICAgICAgICAgICQuZm9ybVV0aWxzLl9zZWxlY3RlZFN1Z2dlc3Rpb24gPSAkc3VnZ2VzdGlvbnMubGVuZ3RoIC0gMTtcbiAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAkLmZvcm1VdGlscy5fc2VsZWN0ZWRTdWdnZXN0aW9uLS07XG4gICAgICAgICAgICAgICAgaWYgKCQuZm9ybVV0aWxzLl9zZWxlY3RlZFN1Z2dlc3Rpb24gPCAwKVxuICAgICAgICAgICAgICAgICAgJC5mb3JtVXRpbHMuX3NlbGVjdGVkU3VnZ2VzdGlvbiA9ICRzdWdnZXN0aW9ucy5sZW5ndGggLSAxO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGVsc2UgaWYgKGNvZGUgPT0gNDApIHsgLy8ga2V5IGRvd25cbiAgICAgICAgICAgICAgICBpZiAoJC5mb3JtVXRpbHMuX3NlbGVjdGVkU3VnZ2VzdGlvbiA9PT0gbnVsbClcbiAgICAgICAgICAgICAgICAgICQuZm9ybVV0aWxzLl9zZWxlY3RlZFN1Z2dlc3Rpb24gPSAwO1xuICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICQuZm9ybVV0aWxzLl9zZWxlY3RlZFN1Z2dlc3Rpb24rKztcbiAgICAgICAgICAgICAgICBpZiAoJC5mb3JtVXRpbHMuX3NlbGVjdGVkU3VnZ2VzdGlvbiA+ICgkc3VnZ2VzdGlvbnMubGVuZ3RoIC0gMSkpXG4gICAgICAgICAgICAgICAgICAkLmZvcm1VdGlscy5fc2VsZWN0ZWRTdWdnZXN0aW9uID0gMDtcblxuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgLy8gU2Nyb2xsIGluIHN1Z2dlc3Rpb24gd2luZG93XG4gICAgICAgICAgICAgIHZhciBjb250YWluZXJJbm5lckhlaWdodCA9ICRzdWdnZXN0aW9uQ29udGFpbmVyLmlubmVySGVpZ2h0KCksXG4gICAgICAgICAgICAgICAgY29udGFpbmVyU2Nyb2xsVG9wID0gJHN1Z2dlc3Rpb25Db250YWluZXIuc2Nyb2xsVG9wKCksXG4gICAgICAgICAgICAgICAgc3VnZ2VzdGlvbkhlaWdodCA9ICRzdWdnZXN0aW9uQ29udGFpbmVyLmNoaWxkcmVuKCkuZXEoMCkub3V0ZXJIZWlnaHQoKSxcbiAgICAgICAgICAgICAgICBhY3RpdmVTdWdnZXN0aW9uUG9zWSA9IHN1Z2dlc3Rpb25IZWlnaHQgKiAoJC5mb3JtVXRpbHMuX3NlbGVjdGVkU3VnZ2VzdGlvbik7XG5cbiAgICAgICAgICAgICAgaWYgKGFjdGl2ZVN1Z2dlc3Rpb25Qb3NZIDwgY29udGFpbmVyU2Nyb2xsVG9wIHx8IGFjdGl2ZVN1Z2dlc3Rpb25Qb3NZID4gKGNvbnRhaW5lclNjcm9sbFRvcCArIGNvbnRhaW5lcklubmVySGVpZ2h0KSkge1xuICAgICAgICAgICAgICAgICRzdWdnZXN0aW9uQ29udGFpbmVyLnNjcm9sbFRvcChhY3RpdmVTdWdnZXN0aW9uUG9zWSk7XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAkc3VnZ2VzdGlvbnNcbiAgICAgICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2FjdGl2ZS1zdWdnZXN0aW9uJylcbiAgICAgICAgICAgICAgICAuY3NzKCdiYWNrZ3JvdW5kJywgJ25vbmUnKVxuICAgICAgICAgICAgICAgIC5lcSgkLmZvcm1VdGlscy5fc2VsZWN0ZWRTdWdnZXN0aW9uKVxuICAgICAgICAgICAgICAgIC5hZGRDbGFzcygnYWN0aXZlLXN1Z2dlc3Rpb24nKVxuICAgICAgICAgICAgICAgIC5jc3MoY29uZi5hY3RpdmVTdWdnZXN0aW9uQ1NTKTtcblxuICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgICAgIC51bmJpbmQoJ2JsdXIuc3VnZ2VzdCcpXG4gICAgICAgIC5iaW5kKCdibHVyLnN1Z2dlc3QnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgb25TZWxlY3RTdWdnZXN0aW9uKCQodGhpcykpO1xuICAgICAgICB9KTtcblxuICAgICAgcmV0dXJuICRlbGVtO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBFcnJvciBkaWFsb2dzXG4gICAgICpcbiAgICAgKiBAdmFyIHtPYmplY3R9XG4gICAgICovXG4gICAgTEFORzoge1xuICAgICAgZXJyb3JUaXRsZTogJ0Zvcm0gc3VibWlzc2lvbiBmYWlsZWQhJyxcbiAgICAgIHJlcXVpcmVkRmllbGRzOiAnWW91IGhhdmUgbm90IGFuc3dlcmVkIGFsbCByZXF1aXJlZCBmaWVsZHMnLFxuICAgICAgYmFkVGltZTogJ1lvdSBoYXZlIG5vdCBnaXZlbiBhIGNvcnJlY3QgdGltZScsXG4gICAgICBiYWRFbWFpbDogJ1lvdSBoYXZlIG5vdCBnaXZlbiBhIGNvcnJlY3QgZS1tYWlsIGFkZHJlc3MnLFxuICAgICAgYmFkVGVsZXBob25lOiAnWW91IGhhdmUgbm90IGdpdmVuIGEgY29ycmVjdCBwaG9uZSBudW1iZXInLFxuICAgICAgYmFkU2VjdXJpdHlBbnN3ZXI6ICdZb3UgaGF2ZSBub3QgZ2l2ZW4gYSBjb3JyZWN0IGFuc3dlciB0byB0aGUgc2VjdXJpdHkgcXVlc3Rpb24nLFxuICAgICAgYmFkRGF0ZTogJ1lvdSBoYXZlIG5vdCBnaXZlbiBhIGNvcnJlY3QgZGF0ZScsXG4gICAgICBsZW5ndGhCYWRTdGFydDogJ1RoZSBpbnB1dCB2YWx1ZSBtdXN0IGJlIGJldHdlZW4gJyxcbiAgICAgIGxlbmd0aEJhZEVuZDogJyBjaGFyYWN0ZXJzJyxcbiAgICAgIGxlbmd0aFRvb0xvbmdTdGFydDogJ1RoZSBpbnB1dCB2YWx1ZSBpcyBsb25nZXIgdGhhbiAnLFxuICAgICAgbGVuZ3RoVG9vU2hvcnRTdGFydDogJ1RoZSBpbnB1dCB2YWx1ZSBpcyBzaG9ydGVyIHRoYW4gJyxcbiAgICAgIG5vdENvbmZpcm1lZDogJ0lucHV0IHZhbHVlcyBjb3VsZCBub3QgYmUgY29uZmlybWVkJyxcbiAgICAgIGJhZERvbWFpbjogJ0luY29ycmVjdCBkb21haW4gdmFsdWUnLFxuICAgICAgYmFkVXJsOiAnVGhlIGlucHV0IHZhbHVlIGlzIG5vdCBhIGNvcnJlY3QgVVJMJyxcbiAgICAgIGJhZEN1c3RvbVZhbDogJ1RoZSBpbnB1dCB2YWx1ZSBpcyBpbmNvcnJlY3QnLFxuICAgICAgYW5kU3BhY2VzOiAnIGFuZCBzcGFjZXMgJyxcbiAgICAgIGJhZEludDogJ1RoZSBpbnB1dCB2YWx1ZSB3YXMgbm90IGEgY29ycmVjdCBudW1iZXInLFxuICAgICAgYmFkU2VjdXJpdHlOdW1iZXI6ICdZb3VyIHNvY2lhbCBzZWN1cml0eSBudW1iZXIgd2FzIGluY29ycmVjdCcsXG4gICAgICBiYWRVS1ZhdEFuc3dlcjogJ0luY29ycmVjdCBVSyBWQVQgTnVtYmVyJyxcbiAgICAgIGJhZFN0cmVuZ3RoOiAnVGhlIHBhc3N3b3JkIGlzblxcJ3Qgc3Ryb25nIGVub3VnaCcsXG4gICAgICBiYWROdW1iZXJPZlNlbGVjdGVkT3B0aW9uc1N0YXJ0OiAnWW91IGhhdmUgdG8gY2hvb3NlIGF0IGxlYXN0ICcsXG4gICAgICBiYWROdW1iZXJPZlNlbGVjdGVkT3B0aW9uc0VuZDogJyBhbnN3ZXJzJyxcbiAgICAgIGJhZEFscGhhTnVtZXJpYzogJ1RoZSBpbnB1dCB2YWx1ZSBjYW4gb25seSBjb250YWluIGFscGhhbnVtZXJpYyBjaGFyYWN0ZXJzICcsXG4gICAgICBiYWRBbHBoYU51bWVyaWNFeHRyYTogJyBhbmQgJyxcbiAgICAgIHdyb25nRmlsZVNpemU6ICdUaGUgZmlsZSB5b3UgYXJlIHRyeWluZyB0byB1cGxvYWQgaXMgdG9vIGxhcmdlIChtYXggJXMpJyxcbiAgICAgIHdyb25nRmlsZVR5cGU6ICdPbmx5IGZpbGVzIG9mIHR5cGUgJXMgaXMgYWxsb3dlZCcsXG4gICAgICBncm91cENoZWNrZWRSYW5nZVN0YXJ0OiAnUGxlYXNlIGNob29zZSBiZXR3ZWVuICcsXG4gICAgICBncm91cENoZWNrZWRUb29GZXdTdGFydDogJ1BsZWFzZSBjaG9vc2UgYXQgbGVhc3QgJyxcbiAgICAgIGdyb3VwQ2hlY2tlZFRvb01hbnlTdGFydDogJ1BsZWFzZSBjaG9vc2UgYSBtYXhpbXVtIG9mICcsXG4gICAgICBncm91cENoZWNrZWRFbmQ6ICcgaXRlbShzKScsXG4gICAgICBiYWRDcmVkaXRDYXJkOiAnVGhlIGNyZWRpdCBjYXJkIG51bWJlciBpcyBub3QgY29ycmVjdCcsXG4gICAgICBiYWRDVlY6ICdUaGUgQ1ZWIG51bWJlciB3YXMgbm90IGNvcnJlY3QnLFxuICAgICAgd3JvbmdGaWxlRGltIDogJ0luY29ycmVjdCBpbWFnZSBkaW1lbnNpb25zLCcsXG4gICAgICBpbWFnZVRvb1RhbGwgOiAndGhlIGltYWdlIGNhbiBub3QgYmUgdGFsbGVyIHRoYW4nLFxuICAgICAgaW1hZ2VUb29XaWRlIDogJ3RoZSBpbWFnZSBjYW4gbm90IGJlIHdpZGVyIHRoYW4nLFxuICAgICAgaW1hZ2VUb29TbWFsbCA6ICd0aGUgaW1hZ2Ugd2FzIHRvbyBzbWFsbCcsXG4gICAgICBtaW4gOiAnbWluJyxcbiAgICAgIG1heCA6ICdtYXgnLFxuICAgICAgaW1hZ2VSYXRpb05vdEFjY2VwdGVkIDogJ0ltYWdlIHJhdGlvIGlzIG5vdCBiZSBhY2NlcHRlZCcsXG4gICAgICBiYWRCcmF6aWxUZWxlcGhvbmVBbnN3ZXI6ICdUaGUgcGhvbmUgbnVtYmVyIGVudGVyZWQgaXMgaW52YWxpZCcsXG4gICAgICBiYWRCcmF6aWxDRVBBbnN3ZXI6ICdUaGUgQ0VQIGVudGVyZWQgaXMgaW52YWxpZCcsXG4gICAgICBiYWRCcmF6aWxDUEZBbnN3ZXI6ICdUaGUgQ1BGIGVudGVyZWQgaXMgaW52YWxpZCdcbiAgICB9XG4gIH07XG5cblxuICAvKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKlxuICAgQ09SRSBWQUxJREFUT1JTXG4gICAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKiAqICogKi9cblxuXG4gIC8qXG4gICAqIFZhbGlkYXRlIGVtYWlsXG4gICAqL1xuICAkLmZvcm1VdGlscy5hZGRWYWxpZGF0b3Ioe1xuICAgIG5hbWU6ICdlbWFpbCcsXG4gICAgdmFsaWRhdG9yRnVuY3Rpb246IGZ1bmN0aW9uIChlbWFpbCkge1xuXG4gICAgICB2YXIgZW1haWxQYXJ0cyA9IGVtYWlsLnRvTG93ZXJDYXNlKCkuc3BsaXQoJ0AnKSxcbiAgICAgICAgICBsb2NhbFBhcnQgPSBlbWFpbFBhcnRzWzBdLFxuICAgICAgICAgIGRvbWFpbiA9IGVtYWlsUGFydHNbMV07XG5cbiAgICAgIGlmIChsb2NhbFBhcnQgJiYgZG9tYWluKSB7XG5cbiAgICAgICAgaWYoIGxvY2FsUGFydC5pbmRleE9mKCdcIicpID09IDAgKSB7XG4gICAgICAgICAgdmFyIGxlbiA9IGxvY2FsUGFydC5sZW5ndGg7XG4gICAgICAgICAgbG9jYWxQYXJ0ID0gbG9jYWxQYXJ0LnJlcGxhY2UoL1xcXCIvZywgJycpO1xuICAgICAgICAgIGlmKCBsb2NhbFBhcnQubGVuZ3RoICE9IChsZW4tMikgKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7IC8vIEl0IHdhcyBub3QgYWxsb3dlZCB0byBoYXZlIG1vcmUgdGhhbiB0d28gYXBvc3Ryb3BoZXNcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gJC5mb3JtVXRpbHMudmFsaWRhdG9ycy52YWxpZGF0ZV9kb21haW4udmFsaWRhdG9yRnVuY3Rpb24oZW1haWxQYXJ0c1sxXSkgJiZcbiAgICAgICAgICAgICAgbG9jYWxQYXJ0LmluZGV4T2YoJy4nKSAhPSAwICYmXG4gICAgICAgICAgICAgIGxvY2FsUGFydC5zdWJzdHJpbmcobG9jYWxQYXJ0Lmxlbmd0aC0xLCBsb2NhbFBhcnQubGVuZ3RoKSAhPSAnLicgJiZcbiAgICAgICAgICAgICAgbG9jYWxQYXJ0LmluZGV4T2YoJy4uJykgPT0gLTEgJiZcbiAgICAgICAgICAgICAgISgvW15cXHdcXCtcXC5cXC1cXCNcXC1cXF9cXH5cXCFcXCRcXCZcXCdcXChcXClcXCpcXCtcXCxcXDtcXD1cXDpdLy50ZXN0KGxvY2FsUGFydCkpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSxcbiAgICBlcnJvck1lc3NhZ2U6ICcnLFxuICAgIGVycm9yTWVzc2FnZUtleTogJ2JhZEVtYWlsJ1xuICB9KTtcblxuICAvKlxuICAgKiBWYWxpZGF0ZSBkb21haW4gbmFtZVxuICAgKi9cbiAgJC5mb3JtVXRpbHMuYWRkVmFsaWRhdG9yKHtcbiAgICBuYW1lOiAnZG9tYWluJyxcbiAgICB2YWxpZGF0b3JGdW5jdGlvbjogZnVuY3Rpb24gKHZhbCkge1xuICAgICAgcmV0dXJuIHZhbC5sZW5ndGggPiAwICYmXG4gICAgICAgIHZhbC5sZW5ndGggPD0gMjUzICYmIC8vIEluY2x1ZGluZyBzdWIgZG9tYWluc1xuICAgICAgICAhKC9bXmEtekEtWjAtOV0vLnRlc3QodmFsLnNsaWNlKC0yKSkpICYmICEoL1teYS16QS1aMC05XS8udGVzdCh2YWwuc3Vic3RyKDAsIDEpKSkgJiYgISgvW15hLXpBLVowLTlcXC5cXC1dLy50ZXN0KHZhbCkpICYmXG4gICAgICAgIHZhbC5zcGxpdCgnLi4nKS5sZW5ndGggPT0gMSAmJlxuICAgICAgICB2YWwuc3BsaXQoJy4nKS5sZW5ndGggPiAxO1xuICAgIH0sXG4gICAgZXJyb3JNZXNzYWdlOiAnJyxcbiAgICBlcnJvck1lc3NhZ2VLZXk6ICdiYWREb21haW4nXG4gIH0pO1xuXG4gIC8qXG4gICAqIFZhbGlkYXRlIHJlcXVpcmVkXG4gICAqL1xuICAkLmZvcm1VdGlscy5hZGRWYWxpZGF0b3Ioe1xuICAgIG5hbWU6ICdyZXF1aXJlZCcsXG4gICAgdmFsaWRhdG9yRnVuY3Rpb246IGZ1bmN0aW9uICh2YWwsICRlbCwgY29uZmlnLCBsYW5ndWFnZSwgJGZvcm0pIHtcbiAgICAgIHN3aXRjaCAoJGVsLmF0dHIoJ3R5cGUnKSkge1xuICAgICAgICBjYXNlICdjaGVja2JveCc6XG4gICAgICAgICAgcmV0dXJuICRlbC5pcygnOmNoZWNrZWQnKTtcbiAgICAgICAgY2FzZSAncmFkaW8nOlxuICAgICAgICAgIHJldHVybiAkZm9ybS5maW5kKCdpbnB1dFtuYW1lPVwiJyArICRlbC5hdHRyKCduYW1lJykgKyAnXCJdJykuZmlsdGVyKCc6Y2hlY2tlZCcpLmxlbmd0aCA+IDA7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgcmV0dXJuICQudHJpbSh2YWwpICE9PSAnJztcbiAgICAgIH1cbiAgICB9LFxuICAgIGVycm9yTWVzc2FnZTogJycsXG4gICAgZXJyb3JNZXNzYWdlS2V5OiAncmVxdWlyZWRGaWVsZHMnXG4gIH0pO1xuXG4gIC8qXG4gICAqIFZhbGlkYXRlIGxlbmd0aCByYW5nZVxuICAgKi9cbiAgJC5mb3JtVXRpbHMuYWRkVmFsaWRhdG9yKHtcbiAgICBuYW1lOiAnbGVuZ3RoJyxcbiAgICB2YWxpZGF0b3JGdW5jdGlvbjogZnVuY3Rpb24gKHZhbCwgJGVsLCBjb25mLCBsYW5nKSB7XG4gICAgICB2YXIgbGVuZ3RoQWxsb3dlZCA9ICRlbC52YWxBdHRyKCdsZW5ndGgnKSxcbiAgICAgICAgdHlwZSA9ICRlbC5hdHRyKCd0eXBlJyk7XG5cbiAgICAgIGlmIChsZW5ndGhBbGxvd2VkID09IHVuZGVmaW5lZCkge1xuICAgICAgICBhbGVydCgnUGxlYXNlIGFkZCBhdHRyaWJ1dGUgXCJkYXRhLXZhbGlkYXRpb24tbGVuZ3RoXCIgdG8gJyArICRlbFswXS5ub2RlTmFtZSArICcgbmFtZWQgJyArICRlbC5hdHRyKCduYW1lJykpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgLy8gY2hlY2sgaWYgbGVuZ3RoIGlzIGFib3ZlIG1pbiwgYmVsb3cgbWF4IG9yIHdpdGhpbiByYW5nZS5cbiAgICAgIHZhciBsZW4gPSB0eXBlID09ICdmaWxlJyAmJiAkZWwuZ2V0KDApLmZpbGVzICE9PSB1bmRlZmluZWQgPyAkZWwuZ2V0KDApLmZpbGVzLmxlbmd0aCA6IHZhbC5sZW5ndGgsXG4gICAgICAgIGxlbmd0aENoZWNrUmVzdWx0cyA9ICQuZm9ybVV0aWxzLm51bWVyaWNSYW5nZUNoZWNrKGxlbiwgbGVuZ3RoQWxsb3dlZCksXG4gICAgICAgIGNoZWNrUmVzdWx0O1xuXG4gICAgICBzd2l0Y2ggKGxlbmd0aENoZWNrUmVzdWx0c1swXSkgeyAgIC8vIG91dHNpZGUgb2YgYWxsb3dlZCByYW5nZVxuICAgICAgICBjYXNlIFwib3V0XCI6XG4gICAgICAgICAgdGhpcy5lcnJvck1lc3NhZ2UgPSBsYW5nLmxlbmd0aEJhZFN0YXJ0ICsgbGVuZ3RoQWxsb3dlZCArIGxhbmcubGVuZ3RoQmFkRW5kO1xuICAgICAgICAgIGNoZWNrUmVzdWx0ID0gZmFsc2U7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIC8vIHRvbyBzaG9ydFxuICAgICAgICBjYXNlIFwibWluXCI6XG4gICAgICAgICAgdGhpcy5lcnJvck1lc3NhZ2UgPSBsYW5nLmxlbmd0aFRvb1Nob3J0U3RhcnQgKyBsZW5ndGhDaGVja1Jlc3VsdHNbMV0gKyBsYW5nLmxlbmd0aEJhZEVuZDtcbiAgICAgICAgICBjaGVja1Jlc3VsdCA9IGZhbHNlO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICAvLyB0b28gbG9uZ1xuICAgICAgICBjYXNlIFwibWF4XCI6XG4gICAgICAgICAgdGhpcy5lcnJvck1lc3NhZ2UgPSBsYW5nLmxlbmd0aFRvb0xvbmdTdGFydCArIGxlbmd0aENoZWNrUmVzdWx0c1sxXSArIGxhbmcubGVuZ3RoQmFkRW5kO1xuICAgICAgICAgIGNoZWNrUmVzdWx0ID0gZmFsc2U7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIC8vIG9rXG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgY2hlY2tSZXN1bHQgPSB0cnVlO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gY2hlY2tSZXN1bHQ7XG4gICAgfSxcbiAgICBlcnJvck1lc3NhZ2U6ICcnLFxuICAgIGVycm9yTWVzc2FnZUtleTogJydcbiAgfSk7XG5cbiAgLypcbiAgICogVmFsaWRhdGUgdXJsXG4gICAqL1xuICAkLmZvcm1VdGlscy5hZGRWYWxpZGF0b3Ioe1xuICAgIG5hbWU6ICd1cmwnLFxuICAgIHZhbGlkYXRvckZ1bmN0aW9uOiBmdW5jdGlvbiAodXJsKSB7XG4gICAgICAvLyB3cml0dGVuIGJ5IFNjb3R0IEdvbnphbGV6OiBodHRwOi8vcHJvamVjdHMuc2NvdHRzcGxheWdyb3VuZC5jb20vaXJpL1xuICAgICAgLy8gLSBWaWN0b3IgSm9uc3NvbiBhZGRlZCBzdXBwb3J0IGZvciBhcnJheXMgaW4gdGhlIHVybCA/YXJnW109c2Rmc2RmXG4gICAgICAvLyAtIEdlbmVyYWwgaW1wcm92ZW1lbnRzIG1hZGUgYnkgU3TDqXBoYW5lIE1vdXJlYXUgPGh0dHBzOi8vZ2l0aHViLmNvbS9UcmFkZXJTdGY+XG4gICAgICB2YXIgdXJsRmlsdGVyID0gL14oaHR0cHM/fGZ0cCk6XFwvXFwvKCgoKFxcd3wtfFxcLnx+fFtcXHUwMEEwLVxcdUQ3RkZcXHVGOTAwLVxcdUZEQ0ZcXHVGREYwLVxcdUZGRUZdKXwoJVtcXGRhLWZdezJ9KXxbIVxcJCYnXFwoXFwpXFwqXFwrLDs9XXw6KSpAKT8oKChcXGR8WzEtOV1cXGR8MVxcZFxcZHwyWzAtNF1cXGR8MjVbMC01XSlcXC4oXFxkfFsxLTldXFxkfDFcXGRcXGR8MlswLTRdXFxkfDI1WzAtNV0pXFwuKFxcZHxbMS05XVxcZHwxXFxkXFxkfDJbMC00XVxcZHwyNVswLTVdKVxcLihcXGR8WzEtOV1cXGR8MVxcZFxcZHwyWzAtNF1cXGR8MjVbMC01XSkpfCgoKFthLXpdfFxcZHxbXFx1MDBBMC1cXHVEN0ZGXFx1RjkwMC1cXHVGRENGXFx1RkRGMC1cXHVGRkVGXSl8KChbYS16XXxcXGR8W1xcdTAwQTAtXFx1RDdGRlxcdUY5MDAtXFx1RkRDRlxcdUZERjAtXFx1RkZFRl0pKFxcd3wtfFxcLnx+fFtcXHUwMEEwLVxcdUQ3RkZcXHVGOTAwLVxcdUZEQ0ZcXHVGREYwLVxcdUZGRUZdKSooW2Etel18XFxkfFtcXHUwMEEwLVxcdUQ3RkZcXHVGOTAwLVxcdUZEQ0ZcXHVGREYwLVxcdUZGRUZdKSkpXFwuKSsoKFthLXpdfFtcXHUwMEEwLVxcdUQ3RkZcXHVGOTAwLVxcdUZEQ0ZcXHVGREYwLVxcdUZGRUZdKXwoKFthLXpdfFtcXHUwMEEwLVxcdUQ3RkZcXHVGOTAwLVxcdUZEQ0ZcXHVGREYwLVxcdUZGRUZdKShcXHd8LXxcXC58fnxbXFx1MDBBMC1cXHVEN0ZGXFx1RjkwMC1cXHVGRENGXFx1RkRGMC1cXHVGRkVGXSkqKFthLXpdfFtcXHUwMEEwLVxcdUQ3RkZcXHVGOTAwLVxcdUZEQ0ZcXHVGREYwLVxcdUZGRUZdKSkpXFwuPykoOlxcZCopPykoXFwvKCgoXFx3fC18XFwufH58W1xcdTAwQTAtXFx1RDdGRlxcdUY5MDAtXFx1RkRDRlxcdUZERjAtXFx1RkZFRl0pfCglW1xcZGEtZl17Mn0pfFshXFwkJidcXChcXClcXCpcXCssOz1dfDp8QCkrKFxcLygoXFx3fC18XFwufH58W1xcdTAwQTAtXFx1RDdGRlxcdUY5MDAtXFx1RkRDRlxcdUZERjAtXFx1RkZFRl0pfCglW1xcZGEtZl17Mn0pfFshXFwkJidcXChcXClcXCpcXCssOz1dfDp8QCkqKSopPyk/KFxcPygoKFthLXpdfFxcZHxcXFt8XFxdfC18XFwufF98fnxbXFx1MDBBMC1cXHVEN0ZGXFx1RjkwMC1cXHVGRENGXFx1RkRGMC1cXHVGRkVGXSl8KCVbXFxkYS1mXXsyfSl8WyFcXCQmJ1xcKFxcKVxcKlxcKyw7PV18OnxAKXxbXFx1RTAwMC1cXHVGOEZGXXxcXC98XFw/KSopPyhcXCMoKChcXHd8LXxcXC58fnxbXFx1MDBBMC1cXHVEN0ZGXFx1RjkwMC1cXHVGRENGXFx1RkRGMC1cXHVGRkVGXSl8KCVbXFxkYS1mXXsyfSl8WyFcXCQmJ1xcKFxcKVxcKlxcKyw7PV18OnxAKXxcXC98XFw/KSopPyQvaTtcbiAgICAgIGlmICh1cmxGaWx0ZXIudGVzdCh1cmwpKSB7XG4gICAgICAgIHZhciBkb21haW4gPSB1cmwuc3BsaXQoJzovLycpWzFdLFxuICAgICAgICAgIGRvbWFpblNsYXNoUG9zID0gZG9tYWluLmluZGV4T2YoJy8nKTtcblxuICAgICAgICBpZiAoZG9tYWluU2xhc2hQb3MgPiAtMSlcbiAgICAgICAgICBkb21haW4gPSBkb21haW4uc3Vic3RyKDAsIGRvbWFpblNsYXNoUG9zKTtcblxuICAgICAgICByZXR1cm4gJC5mb3JtVXRpbHMudmFsaWRhdG9ycy52YWxpZGF0ZV9kb21haW4udmFsaWRhdG9yRnVuY3Rpb24oZG9tYWluKTsgLy8gdG9kbzogYWRkIHN1cHBvcnQgZm9yIElQLWFkZHJlc3Nlc1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0sXG4gICAgZXJyb3JNZXNzYWdlOiAnJyxcbiAgICBlcnJvck1lc3NhZ2VLZXk6ICdiYWRVcmwnXG4gIH0pO1xuXG4gIC8qXG4gICAqIFZhbGlkYXRlIG51bWJlciAoZmxvYXRpbmcgb3IgaW50ZWdlcilcbiAgICovXG4gICQuZm9ybVV0aWxzLmFkZFZhbGlkYXRvcih7XG4gICAgbmFtZTogJ251bWJlcicsXG4gICAgdmFsaWRhdG9yRnVuY3Rpb246IGZ1bmN0aW9uICh2YWwsICRlbCwgY29uZikge1xuICAgICAgaWYgKHZhbCAhPT0gJycpIHtcbiAgICAgICAgdmFyIGFsbG93aW5nID0gJGVsLnZhbEF0dHIoJ2FsbG93aW5nJykgfHwgJycsXG4gICAgICAgICAgZGVjaW1hbFNlcGFyYXRvciA9ICRlbC52YWxBdHRyKCdkZWNpbWFsLXNlcGFyYXRvcicpIHx8IGNvbmYuZGVjaW1hbFNlcGFyYXRvcixcbiAgICAgICAgICBhbGxvd3NSYW5nZSA9IGZhbHNlLFxuICAgICAgICAgIGJlZ2luLCBlbmQsXG4gICAgICAgICAgc3RlcHMgPSAkZWwudmFsQXR0cignc3RlcCcpIHx8ICcnLFxuICAgICAgICAgIGFsbG93c1N0ZXBzID0gZmFsc2U7XG5cbiAgICAgICAgaWYgKGFsbG93aW5nLmluZGV4T2YoJ251bWJlcicpID09IC0xKVxuICAgICAgICAgIGFsbG93aW5nICs9ICcsbnVtYmVyJztcblxuICAgICAgICBpZiAoYWxsb3dpbmcuaW5kZXhPZignbmVnYXRpdmUnKSA9PSAtMSAmJiB2YWwuaW5kZXhPZignLScpID09PSAwKSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGFsbG93aW5nLmluZGV4T2YoJ3JhbmdlJykgPiAtMSkge1xuICAgICAgICAgIGJlZ2luID0gcGFyc2VGbG9hdChhbGxvd2luZy5zdWJzdHJpbmcoYWxsb3dpbmcuaW5kZXhPZihcIltcIikgKyAxLCBhbGxvd2luZy5pbmRleE9mKFwiO1wiKSkpO1xuICAgICAgICAgIGVuZCA9IHBhcnNlRmxvYXQoYWxsb3dpbmcuc3Vic3RyaW5nKGFsbG93aW5nLmluZGV4T2YoXCI7XCIpICsgMSwgYWxsb3dpbmcuaW5kZXhPZihcIl1cIikpKTtcbiAgICAgICAgICBhbGxvd3NSYW5nZSA9IHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoc3RlcHMgIT0gXCJcIilcbiAgICAgICAgICBhbGxvd3NTdGVwcyA9IHRydWU7XG5cbiAgICAgICAgaWYgKGRlY2ltYWxTZXBhcmF0b3IgPT0gJywnKSB7XG4gICAgICAgICAgaWYgKHZhbC5pbmRleE9mKCcuJykgPiAtMSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBGaXggZm9yIGNoZWNraW5nIHJhbmdlIHdpdGggZmxvYXRzIHVzaW5nICxcbiAgICAgICAgICB2YWwgPSB2YWwucmVwbGFjZSgnLCcsICcuJyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoYWxsb3dpbmcuaW5kZXhPZignbnVtYmVyJykgPiAtMSAmJiB2YWwucmVwbGFjZSgvWzAtOS1dL2csICcnKSA9PT0gJycgJiYgKCFhbGxvd3NSYW5nZSB8fCAodmFsID49IGJlZ2luICYmIHZhbCA8PSBlbmQpKSAmJiAoIWFsbG93c1N0ZXBzIHx8ICh2YWwgJSBzdGVwcyA9PSAwKSkpIHtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoYWxsb3dpbmcuaW5kZXhPZignZmxvYXQnKSA+IC0xICYmIHZhbC5tYXRjaChuZXcgUmVnRXhwKCdeKFswLTktXSspXFxcXC4oWzAtOV0rKSQnKSkgIT09IG51bGwgJiYgKCFhbGxvd3NSYW5nZSB8fCAodmFsID49IGJlZ2luICYmIHZhbCA8PSBlbmQpKSAmJiAoIWFsbG93c1N0ZXBzIHx8ICh2YWwgJSBzdGVwcyA9PSAwKSkpIHtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0sXG4gICAgZXJyb3JNZXNzYWdlOiAnJyxcbiAgICBlcnJvck1lc3NhZ2VLZXk6ICdiYWRJbnQnXG4gIH0pO1xuXG4gIC8qXG4gICAqIFZhbGlkYXRlIGFscGhhIG51bWVyaWNcbiAgICovXG4gICQuZm9ybVV0aWxzLmFkZFZhbGlkYXRvcih7XG4gICAgbmFtZTogJ2FscGhhbnVtZXJpYycsXG4gICAgdmFsaWRhdG9yRnVuY3Rpb246IGZ1bmN0aW9uICh2YWwsICRlbCwgY29uZiwgbGFuZ3VhZ2UpIHtcbiAgICAgIHZhciBwYXR0ZXJuU3RhcnQgPSAnXihbYS16QS1aMC05JyxcbiAgICAgICAgcGF0dGVybkVuZCA9ICddKykkJyxcbiAgICAgICAgYWRkaXRpb25hbENoYXJzID0gJGVsLnZhbEF0dHIoJ2FsbG93aW5nJyksXG4gICAgICAgIHBhdHRlcm4gPSAnJztcblxuICAgICAgaWYgKGFkZGl0aW9uYWxDaGFycykge1xuICAgICAgICBwYXR0ZXJuID0gcGF0dGVyblN0YXJ0ICsgYWRkaXRpb25hbENoYXJzICsgcGF0dGVybkVuZDtcbiAgICAgICAgdmFyIGV4dHJhID0gYWRkaXRpb25hbENoYXJzLnJlcGxhY2UoL1xcXFwvZywgJycpO1xuICAgICAgICBpZiAoZXh0cmEuaW5kZXhPZignICcpID4gLTEpIHtcbiAgICAgICAgICBleHRyYSA9IGV4dHJhLnJlcGxhY2UoJyAnLCAnJyk7XG4gICAgICAgICAgZXh0cmEgKz0gbGFuZ3VhZ2UuYW5kU3BhY2VzIHx8ICQuZm9ybVV0aWxzLkxBTkcuYW5kU3BhY2VzO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuZXJyb3JNZXNzYWdlID0gbGFuZ3VhZ2UuYmFkQWxwaGFOdW1lcmljICsgbGFuZ3VhZ2UuYmFkQWxwaGFOdW1lcmljRXh0cmEgKyBleHRyYTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHBhdHRlcm4gPSBwYXR0ZXJuU3RhcnQgKyBwYXR0ZXJuRW5kO1xuICAgICAgICB0aGlzLmVycm9yTWVzc2FnZSA9IGxhbmd1YWdlLmJhZEFscGhhTnVtZXJpYztcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG5ldyBSZWdFeHAocGF0dGVybikudGVzdCh2YWwpO1xuICAgIH0sXG4gICAgZXJyb3JNZXNzYWdlOiAnJyxcbiAgICBlcnJvck1lc3NhZ2VLZXk6ICcnXG4gIH0pO1xuXG4gIC8qXG4gICAqIFZhbGlkYXRlIGFnYWluc3QgcmVnZXhwXG4gICAqL1xuICAkLmZvcm1VdGlscy5hZGRWYWxpZGF0b3Ioe1xuICAgIG5hbWU6ICdjdXN0b20nLFxuICAgIHZhbGlkYXRvckZ1bmN0aW9uOiBmdW5jdGlvbiAodmFsLCAkZWwsIGNvbmYpIHtcbiAgICAgIHZhciByZWdleHAgPSBuZXcgUmVnRXhwKCRlbC52YWxBdHRyKCdyZWdleHAnKSk7XG4gICAgICByZXR1cm4gcmVnZXhwLnRlc3QodmFsKTtcbiAgICB9LFxuICAgIGVycm9yTWVzc2FnZTogJycsXG4gICAgZXJyb3JNZXNzYWdlS2V5OiAnYmFkQ3VzdG9tVmFsJ1xuICB9KTtcblxuICAvKlxuICAgKiBWYWxpZGF0ZSBkYXRlXG4gICAqL1xuICAkLmZvcm1VdGlscy5hZGRWYWxpZGF0b3Ioe1xuICAgIG5hbWU6ICdkYXRlJyxcbiAgICB2YWxpZGF0b3JGdW5jdGlvbjogZnVuY3Rpb24gKGRhdGUsICRlbCwgY29uZikge1xuICAgICAgdmFyIGRhdGVGb3JtYXQgPSAkZWwudmFsQXR0cignZm9ybWF0JykgfHwgY29uZi5kYXRlRm9ybWF0IHx8ICd5eXl5LW1tLWRkJztcbiAgICAgIHJldHVybiAkLmZvcm1VdGlscy5wYXJzZURhdGUoZGF0ZSwgZGF0ZUZvcm1hdCkgIT09IGZhbHNlO1xuICAgIH0sXG4gICAgZXJyb3JNZXNzYWdlOiAnJyxcbiAgICBlcnJvck1lc3NhZ2VLZXk6ICdiYWREYXRlJ1xuICB9KTtcblxuXG4gIC8qXG4gICAqIFZhbGlkYXRlIGdyb3VwIG9mIGNoZWNrYm94ZXMsIHZhbGlkYXRlIHF0eSByZXF1aXJlZCBpcyBjaGVja2VkXG4gICAqIHdyaXR0ZW4gYnkgU3RldmUgV2FzaXVyYSA6IGh0dHA6Ly9zdGV2ZXdhc2l1cmEud2F6dGVjaC5jb21cbiAgICogZWxlbWVudCBhdHRyc1xuICAgKiAgICBkYXRhLXZhbGlkYXRpb249XCJjaGVja2JveF9ncm91cFwiXG4gICAqICAgIGRhdGEtdmFsaWRhdGlvbi1xdHk9XCIxLTJcIiAgLy8gbWluIDEgbWF4IDJcbiAgICogICAgZGF0YS12YWxpZGF0aW9uLWVycm9yLW1zZz1cImNob3NlIG1pbiAxLCBtYXggb2YgMiBjaGVja2JveGVzXCJcbiAgICovXG4gICQuZm9ybVV0aWxzLmFkZFZhbGlkYXRvcih7XG4gICAgbmFtZTogJ2NoZWNrYm94X2dyb3VwJyxcbiAgICB2YWxpZGF0b3JGdW5jdGlvbjogZnVuY3Rpb24gKHZhbCwgJGVsLCBjb25mLCBsYW5nLCAkZm9ybSkge1xuICAgICAgLy8gcHJlc2V0IHJldHVybiB2YXJcbiAgICAgIHZhciBpc1ZhbGlkID0gdHJ1ZSxcbiAgICAgICAgLy8gZ2V0IG5hbWUgb2YgZWxlbWVudC4gc2luY2UgaXQgaXMgYSBjaGVja2JveCBncm91cCwgYWxsIGNoZWNrYm94ZXMgd2lsbCBoYXZlIHNhbWUgbmFtZVxuICAgICAgICBlbG5hbWUgPSAkZWwuYXR0cignbmFtZScpLFxuICAgICAgICAvLyBnZXQgY2hlY2tib3hlcyBhbmQgY291bnQgdGhlIGNoZWNrZWQgb25lc1xuICAgICAgICAkY2hlY2tCb3hlcyA9ICQoXCJpbnB1dFt0eXBlPWNoZWNrYm94XVtuYW1lXj0nXCIgKyBlbG5hbWUgKyBcIiddXCIsICRmb3JtKSxcbiAgICAgICAgY2hlY2tlZENvdW50ID0gJGNoZWNrQm94ZXMuZmlsdGVyKCc6Y2hlY2tlZCcpLmxlbmd0aCxcbiAgICAgICAgLy8gZ2V0IGVsIGF0dHIgdGhhdCBzcGVjcyBxdHkgcmVxdWlyZWQgLyBhbGxvd2VkXG4gICAgICAgIHF0eUFsbG93ZWQgPSAkZWwudmFsQXR0cigncXR5Jyk7XG5cbiAgICAgIGlmIChxdHlBbGxvd2VkID09IHVuZGVmaW5lZCkge1xuICAgICAgICB2YXIgZWxlbWVudFR5cGUgPSAkZWwuZ2V0KDApLm5vZGVOYW1lO1xuICAgICAgICBhbGVydCgnQXR0cmlidXRlIFwiZGF0YS12YWxpZGF0aW9uLXF0eVwiIGlzIG1pc3NpbmcgZnJvbSAnICsgZWxlbWVudFR5cGUgKyAnIG5hbWVkICcgKyAkZWwuYXR0cignbmFtZScpKTtcbiAgICAgIH1cblxuICAgICAgLy8gY2FsbCBVdGlsaXR5IGZ1bmN0aW9uIHRvIGNoZWNrIGlmIGNvdW50IGlzIGFib3ZlIG1pbiwgYmVsb3cgbWF4LCB3aXRoaW4gcmFuZ2UgZXRjLlxuICAgICAgdmFyIHF0eUNoZWNrUmVzdWx0cyA9ICQuZm9ybVV0aWxzLm51bWVyaWNSYW5nZUNoZWNrKGNoZWNrZWRDb3VudCwgcXR5QWxsb3dlZCk7XG5cbiAgICAgIC8vIHJlc3VsdHMgd2lsbCBiZSBhcnJheSwgWzBdPXJlc3VsdCBzdHIsIFsxXT1xdHkgaW50XG4gICAgICBzd2l0Y2ggKHF0eUNoZWNrUmVzdWx0c1swXSkge1xuICAgICAgICAvLyBvdXRzaWRlIGFsbG93ZWQgcmFuZ2VcbiAgICAgICAgY2FzZSBcIm91dFwiOlxuICAgICAgICAgIHRoaXMuZXJyb3JNZXNzYWdlID0gbGFuZy5ncm91cENoZWNrZWRSYW5nZVN0YXJ0ICsgcXR5QWxsb3dlZCArIGxhbmcuZ3JvdXBDaGVja2VkRW5kO1xuICAgICAgICAgIGlzVmFsaWQgPSBmYWxzZTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgLy8gYmVsb3cgbWluIHF0eVxuICAgICAgICBjYXNlIFwibWluXCI6XG4gICAgICAgICAgdGhpcy5lcnJvck1lc3NhZ2UgPSBsYW5nLmdyb3VwQ2hlY2tlZFRvb0Zld1N0YXJ0ICsgcXR5Q2hlY2tSZXN1bHRzWzFdICsgbGFuZy5ncm91cENoZWNrZWRFbmQ7XG4gICAgICAgICAgaXNWYWxpZCA9IGZhbHNlO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICAvLyBhYm92ZSBtYXggcXR5XG4gICAgICAgIGNhc2UgXCJtYXhcIjpcbiAgICAgICAgICB0aGlzLmVycm9yTWVzc2FnZSA9IGxhbmcuZ3JvdXBDaGVja2VkVG9vTWFueVN0YXJ0ICsgcXR5Q2hlY2tSZXN1bHRzWzFdICsgbGFuZy5ncm91cENoZWNrZWRFbmQ7XG4gICAgICAgICAgaXNWYWxpZCA9IGZhbHNlO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICAvLyBva1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIGlzVmFsaWQgPSB0cnVlO1xuICAgICAgfVxuXG4gICAgICBpZiggIWlzVmFsaWQgKSB7XG4gICAgICAgIHZhciBfdHJpZ2dlck9uQmx1ciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICRjaGVja0JveGVzLnVuYmluZCgnY2xpY2snLCBfdHJpZ2dlck9uQmx1cik7XG4gICAgICAgICAgJGNoZWNrQm94ZXMuZmlsdGVyKCcqW2RhdGEtdmFsaWRhdGlvbl0nKS52YWxpZGF0ZUlucHV0T25CbHVyKGxhbmcsIGNvbmYsIGZhbHNlLCAnYmx1cicpO1xuICAgICAgICB9O1xuICAgICAgICAkY2hlY2tCb3hlcy5iaW5kKCdjbGljaycsIF90cmlnZ2VyT25CbHVyKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGlzVmFsaWQ7XG4gICAgfVxuICAgIC8vICAgZXJyb3JNZXNzYWdlIDogJycsIC8vIHNldCBhYm92ZSBpbiBzd2l0Y2ggc3RhdGVtZW50XG4gICAgLy8gICBlcnJvck1lc3NhZ2VLZXk6ICcnIC8vIG5vdCB1c2VkXG4gIH0pO1xuXG59KShqUXVlcnkpO1xuIiwiLyoqXG4gKiBqUXVlcnkgRm9ybSBWYWxpZGF0b3IgTW9kdWxlOiBCcmF6aWxcbiAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICogQ3JlYXRlZCBieSBFZHVhcmRvIEN1ZHVjb3MgPGh0dHA6Ly9jdWR1Y29zLm1lLz5cbiAqXG4gKiBUaGlzIGZvcm0gdmFsaWRhdGlvbiBtb2R1bGUgYWRkcyB2YWxpZGF0b3JzIHR5cGljYWxseSB1c2VkIG9uXG4gKiB3ZWJzaXRlcyBpbiB0aGUgQnJhemlsLiBUaGlzIG1vZHVsZSBhZGRzIHRoZSBmb2xsb3dpbmcgdmFsaWRhdG9yczpcbiAqICAtIGNwZlxuICogIC0gY2VwXG4gKiAgLSBicnBob25lXG4gKlxuICogQHdlYnNpdGUgaHR0cDovL2Zvcm12YWxpZGF0b3IubmV0LyNicmF6aWwtdmFsaWRhdG9yc1xuICogQGxpY2Vuc2UgTUlUXG4gKiBAdmVyc2lvbiAyLjIuODFcbiAqL1xuXG4kLmZvcm1VdGlscy5hZGRWYWxpZGF0b3Ioe1xuICAgIG5hbWUgOiAnY3BmJyxcbiAgICB2YWxpZGF0b3JGdW5jdGlvbiA6IGZ1bmN0aW9uKHN0cmluZykge1xuXG4gICAgICAgIC8vIEJhc2VkIG9uIHRoaXMgcG9zdCBmcm9tIERldk1lZGlhOlxuICAgICAgICAvLyBodHRwOi8vd3d3LmRldm1lZGlhLmNvbS5ici92YWxpZGFyLWNwZi1jb20tamF2YXNjcmlwdC8yMzkxNlxuXG4gICAgICAgIC8vIGNsZWFuIHVwIHRoZSBpbnB1dCAoZGlnaXRzIG9ubHkpIGFuZCBzZXQgc29tZSBzdXBwb3J0IHZhcnNcbiAgICAgICAgdmFyIGNwZiA9IHN0cmluZy5yZXBsYWNlKC9cXEQvZyxcIlwiKTtcbiAgICAgICAgdmFyIHN1bTEgPSAwO1xuICAgICAgICB2YXIgc3VtMiA9IDA7XG4gICAgICAgIHZhciByZW1haW5kZXIxID0gMDtcbiAgICAgICAgdmFyIHJlbWFpbmRlcjIgPSAwO1xuXG4gICAgICAgIC8vIHNraXAgc3BlY2lhbCBjYXNlc1xuICAgICAgICBpZiAoY3BmLmxlbmd0aCAhPSAxMSB8fCBjcGYgPT0gXCIwMDAwMDAwMDAwMFwiKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBjaGVjayAxc3QgdmVyaWZpY2F0aW9uIGRpZ2l0XG4gICAgICAgIGZvciAoaT0xOyBpPD05OyBpKyspIHtcbiAgICAgICAgICAgIHN1bTEgKz0gcGFyc2VJbnQoY3BmLnN1YnN0cmluZyhpIC0gMSwgaSkpICogKDExIC0gaSk7XG4gICAgICAgIH1cbiAgICAgICAgcmVtYWluZGVyMSA9IChzdW0xICogMTApICUgMTE7XG4gICAgICAgIGlmIChyZW1haW5kZXIxID49IDEwKSB7XG4gICAgICAgICAgICByZW1haW5kZXIxID0gMDtcbiAgICAgICAgfVxuICAgICAgICBpZiAocmVtYWluZGVyMSAhPSBwYXJzZUludChjcGYuc3Vic3RyaW5nKDksIDEwKSkpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGNoZWNrIDJuZCB2ZXJpZmljYXRpb24gZGlnaXRcbiAgICAgICAgZm9yIChpID0gMTsgaSA8PSAxMDsgaSsrKSB7XG4gICAgICAgICAgICBzdW0yICs9IHBhcnNlSW50KGNwZi5zdWJzdHJpbmcoaSAtIDEsIGkpKSAqICgxMiAtIGkpO1xuICAgICAgICB9XG4gICAgICAgIHJlbWFpbmRlcjIgPSAoc3VtMiAqIDEwKSAlIDExO1xuICAgICAgICBpZiAocmVtYWluZGVyMiA+PSAxMCkge1xuICAgICAgICAgICAgcmVtYWluZGVyMiA9IDA7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlbWFpbmRlcjIgIT0gcGFyc2VJbnQoY3BmLnN1YnN0cmluZygxMCwgMTEpKSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRydWU7XG5cbiAgICB9LFxuICAgIGVycm9yTWVzc2FnZSA6ICcnLFxuICAgIGVycm9yTWVzc2FnZUtleTogJ2JhZEJyYXppbENQRkFuc3dlcidcblxufSk7XG5cbiQuZm9ybVV0aWxzLmFkZFZhbGlkYXRvcih7XG4gICAgbmFtZSA6ICdicnBob25lJyxcbiAgICB2YWxpZGF0b3JGdW5jdGlvbiA6IGZ1bmN0aW9uKHN0cmluZykge1xuXG4gICAgICAgIC8vIHZhbGlkYXRlcyB0ZWxlZm9uZXMgc3VjaCBhcyAoaGF2aW5nIFggYXMgbnVtYmVycyk6XG4gICAgICAgIC8vIChYWCkgWFhYWC1YWFhYXG4gICAgICAgIC8vIChYWCkgWFhYWFgtWFhYWFxuICAgICAgICAvLyBYWCBYWFhYWFhYWFxuICAgICAgICAvLyBYWCBYWFhYWFhYWFhcbiAgICAgICAgLy8gWFhYWFhYWFhYWFxuICAgICAgICAvLyBYWFhYWFhYWFhYWFxuICAgICAgICAvLyArWFggWFggWFhYWFgtWFhYWFxuICAgICAgICAvLyArWCBYWCBYWFhYLVhYWFhcbiAgICAgICAgLy8gQW5kIHNvIG9u4oCmXG5cbiAgICAgICAgaWYgKHN0cmluZy5tYXRjaCgvXihcXCtbXFxkXXsxLDN9W1xcc117MCwxfSl7MCwxfShcXCgpezAsMX0oXFxkKXsyfShcXCkpezAsMX0oXFxzKXswLDF9KFxcZCl7NCw1fShbLS4gXSl7MCwxfShcXGQpezR9JC9nKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZmFsc2U7XG5cbiAgICB9LFxuICAgIGVycm9yTWVzc2FnZSA6ICcnLFxuICAgIGVycm9yTWVzc2FnZUtleTogJ2JhZEJyYXppbFRlbGVwaG9uZUFuc3dlcidcblxufSk7XG5cbiQuZm9ybVV0aWxzLmFkZFZhbGlkYXRvcih7XG4gICAgbmFtZSA6ICdjZXAnLFxuICAgIHZhbGlkYXRvckZ1bmN0aW9uIDogZnVuY3Rpb24oc3RyaW5nKSB7XG5cbiAgICAgICAgLy8gdmFsaWRhdGVzIENFUCAgc3VjaCBhcyAoaGF2aW5nIFggYXMgbnVtYmVycyk6XG4gICAgICAgIC8vIFhYWFhYLVhYWFxuICAgICAgICAvLyBYWFhYWC5YWFhcbiAgICAgICAgLy8gWFhYWFggWFhYXG4gICAgICAgIC8vIFhYWFhYWFhYXG5cbiAgICAgICAgaWYgKHN0cmluZy5tYXRjaCgvXihcXGQpezV9KFstLiBdKXswLDF9KFxcZCl7M30kL2cpKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBmYWxzZTtcblxuICAgIH0sXG4gICAgZXJyb3JNZXNzYWdlIDogJycsXG4gICAgZXJyb3JNZXNzYWdlS2V5OiAnYmFkQnJhemlsQ0VQQW5zd2VyJ1xuXG59KTtcbiIsIi8qIVxuICogTGlnaHRib3ggdjIuOC4yXG4gKiBieSBMb2tlc2ggRGhha2FyXG4gKlxuICogTW9yZSBpbmZvOlxuICogaHR0cDovL2xva2VzaGRoYWthci5jb20vcHJvamVjdHMvbGlnaHRib3gyL1xuICpcbiAqIENvcHlyaWdodCAyMDA3LCAyMDE1IExva2VzaCBEaGFrYXJcbiAqIFJlbGVhc2VkIHVuZGVyIHRoZSBNSVQgbGljZW5zZVxuICogaHR0cHM6Ly9naXRodWIuY29tL2xva2VzaC9saWdodGJveDIvYmxvYi9tYXN0ZXIvTElDRU5TRVxuICovXG5cbi8vIFVzZXMgTm9kZSwgQU1EIG9yIGJyb3dzZXIgZ2xvYmFscyB0byBjcmVhdGUgYSBtb2R1bGUuXG4oZnVuY3Rpb24gKHJvb3QsIGZhY3RvcnkpIHtcbiAgICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgICAgIC8vIEFNRC4gUmVnaXN0ZXIgYXMgYW4gYW5vbnltb3VzIG1vZHVsZS5cbiAgICAgICAgZGVmaW5lKFsnanF1ZXJ5J10sIGZhY3RvcnkpO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnKSB7XG4gICAgICAgIC8vIE5vZGUuIERvZXMgbm90IHdvcmsgd2l0aCBzdHJpY3QgQ29tbW9uSlMsIGJ1dFxuICAgICAgICAvLyBvbmx5IENvbW1vbkpTLWxpa2UgZW52aXJvbm1lbnRzIHRoYXQgc3VwcG9ydCBtb2R1bGUuZXhwb3J0cyxcbiAgICAgICAgLy8gbGlrZSBOb2RlLlxuICAgICAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkocmVxdWlyZSgnanF1ZXJ5JykpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIEJyb3dzZXIgZ2xvYmFscyAocm9vdCBpcyB3aW5kb3cpXG4gICAgICAgIHJvb3QubGlnaHRib3ggPSBmYWN0b3J5KHJvb3QualF1ZXJ5KTtcbiAgICB9XG59KHRoaXMsIGZ1bmN0aW9uICgkKSB7XG5cbiAgZnVuY3Rpb24gTGlnaHRib3gob3B0aW9ucykge1xuICAgIHRoaXMuYWxidW0gPSBbXTtcbiAgICB0aGlzLmN1cnJlbnRJbWFnZUluZGV4ID0gdm9pZCAwO1xuICAgIHRoaXMuaW5pdCgpO1xuXG4gICAgLy8gb3B0aW9uc1xuICAgIHRoaXMub3B0aW9ucyA9ICQuZXh0ZW5kKHt9LCB0aGlzLmNvbnN0cnVjdG9yLmRlZmF1bHRzKTtcbiAgICB0aGlzLm9wdGlvbihvcHRpb25zKTtcbiAgfVxuXG4gIC8vIERlc2NyaXB0aW9ucyBvZiBhbGwgb3B0aW9ucyBhdmFpbGFibGUgb24gdGhlIGRlbW8gc2l0ZTpcbiAgLy8gaHR0cDovL2xva2VzaGRoYWthci5jb20vcHJvamVjdHMvbGlnaHRib3gyL2luZGV4Lmh0bWwjb3B0aW9uc1xuICBMaWdodGJveC5kZWZhdWx0cyA9IHtcbiAgICBhbGJ1bUxhYmVsOiAnSW1hZ2UgJTEgb2YgJTInLFxuICAgIGFsd2F5c1Nob3dOYXZPblRvdWNoRGV2aWNlczogZmFsc2UsXG4gICAgZmFkZUR1cmF0aW9uOiA1MDAsXG4gICAgZml0SW1hZ2VzSW5WaWV3cG9ydDogdHJ1ZSxcbiAgICAvLyBtYXhXaWR0aDogODAwLFxuICAgIC8vIG1heEhlaWdodDogNjAwLFxuICAgIHBvc2l0aW9uRnJvbVRvcDogNTAsXG4gICAgcmVzaXplRHVyYXRpb246IDcwMCxcbiAgICBzaG93SW1hZ2VOdW1iZXJMYWJlbDogdHJ1ZSxcbiAgICB3cmFwQXJvdW5kOiBmYWxzZSxcbiAgICBkaXNhYmxlU2Nyb2xsaW5nOiBmYWxzZVxuICB9O1xuXG4gIExpZ2h0Ym94LnByb3RvdHlwZS5vcHRpb24gPSBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgJC5leHRlbmQodGhpcy5vcHRpb25zLCBvcHRpb25zKTtcbiAgfTtcblxuICBMaWdodGJveC5wcm90b3R5cGUuaW1hZ2VDb3VudExhYmVsID0gZnVuY3Rpb24oY3VycmVudEltYWdlTnVtLCB0b3RhbEltYWdlcykge1xuICAgIHJldHVybiB0aGlzLm9wdGlvbnMuYWxidW1MYWJlbC5yZXBsYWNlKC8lMS9nLCBjdXJyZW50SW1hZ2VOdW0pLnJlcGxhY2UoLyUyL2csIHRvdGFsSW1hZ2VzKTtcbiAgfTtcblxuICBMaWdodGJveC5wcm90b3R5cGUuaW5pdCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuZW5hYmxlKCk7XG4gICAgdGhpcy5idWlsZCgpO1xuICB9O1xuXG4gIC8vIExvb3AgdGhyb3VnaCBhbmNob3JzIGFuZCBhcmVhbWFwcyBsb29raW5nIGZvciBlaXRoZXIgZGF0YS1saWdodGJveCBhdHRyaWJ1dGVzIG9yIHJlbCBhdHRyaWJ1dGVzXG4gIC8vIHRoYXQgY29udGFpbiAnbGlnaHRib3gnLiBXaGVuIHRoZXNlIGFyZSBjbGlja2VkLCBzdGFydCBsaWdodGJveC5cbiAgTGlnaHRib3gucHJvdG90eXBlLmVuYWJsZSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAkKCdib2R5Jykub24oJ2NsaWNrJywgJ2FbcmVsXj1saWdodGJveF0sIGFyZWFbcmVsXj1saWdodGJveF0sIGFbZGF0YS1saWdodGJveF0sIGFyZWFbZGF0YS1saWdodGJveF0nLCBmdW5jdGlvbihldmVudCkge1xuICAgICAgc2VsZi5zdGFydCgkKGV2ZW50LmN1cnJlbnRUYXJnZXQpKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9KTtcbiAgfTtcblxuICAvLyBCdWlsZCBodG1sIGZvciB0aGUgbGlnaHRib3ggYW5kIHRoZSBvdmVybGF5LlxuICAvLyBBdHRhY2ggZXZlbnQgaGFuZGxlcnMgdG8gdGhlIG5ldyBET00gZWxlbWVudHMuIGNsaWNrIGNsaWNrIGNsaWNrXG4gIExpZ2h0Ym94LnByb3RvdHlwZS5idWlsZCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAkKCc8ZGl2IGlkPVwibGlnaHRib3hPdmVybGF5XCIgY2xhc3M9XCJsaWdodGJveE92ZXJsYXlcIj48L2Rpdj48ZGl2IGlkPVwibGlnaHRib3hcIiBjbGFzcz1cImxpZ2h0Ym94XCI+PGRpdiBjbGFzcz1cImxiLW91dGVyQ29udGFpbmVyXCI+PGRpdiBjbGFzcz1cImxiLWNvbnRhaW5lclwiPjxpbWcgY2xhc3M9XCJsYi1pbWFnZVwiIHNyYz1cImRhdGE6aW1hZ2UvZ2lmO2Jhc2U2NCxSMGxHT0RsaEFRQUJBSUFBQVAvLy93QUFBQ0g1QkFFQUFBQUFMQUFBQUFBQkFBRUFBQUlDUkFFQU93PT1cIiAvPjxkaXYgY2xhc3M9XCJsYi1uYXZcIj48YSBjbGFzcz1cImxiLXByZXZcIiBocmVmPVwiXCIgPjwvYT48YSBjbGFzcz1cImxiLW5leHRcIiBocmVmPVwiXCIgPjwvYT48L2Rpdj48ZGl2IGNsYXNzPVwibGItbG9hZGVyXCI+PGEgY2xhc3M9XCJsYi1jYW5jZWxcIj48L2E+PC9kaXY+PC9kaXY+PC9kaXY+PGRpdiBjbGFzcz1cImxiLWRhdGFDb250YWluZXJcIj48ZGl2IGNsYXNzPVwibGItZGF0YVwiPjxkaXYgY2xhc3M9XCJsYi1kZXRhaWxzXCI+PHNwYW4gY2xhc3M9XCJsYi1jYXB0aW9uXCI+PC9zcGFuPjxzcGFuIGNsYXNzPVwibGItbnVtYmVyXCI+PC9zcGFuPjwvZGl2PjxkaXYgY2xhc3M9XCJsYi1jbG9zZUNvbnRhaW5lclwiPjxhIGNsYXNzPVwibGItY2xvc2VcIj48L2E+PC9kaXY+PC9kaXY+PC9kaXY+PC9kaXY+JykuYXBwZW5kVG8oJCgnYm9keScpKTtcblxuICAgIC8vIENhY2hlIGpRdWVyeSBvYmplY3RzXG4gICAgdGhpcy4kbGlnaHRib3ggICAgICAgPSAkKCcjbGlnaHRib3gnKTtcbiAgICB0aGlzLiRvdmVybGF5ICAgICAgICA9ICQoJyNsaWdodGJveE92ZXJsYXknKTtcbiAgICB0aGlzLiRvdXRlckNvbnRhaW5lciA9IHRoaXMuJGxpZ2h0Ym94LmZpbmQoJy5sYi1vdXRlckNvbnRhaW5lcicpO1xuICAgIHRoaXMuJGNvbnRhaW5lciAgICAgID0gdGhpcy4kbGlnaHRib3guZmluZCgnLmxiLWNvbnRhaW5lcicpO1xuXG4gICAgLy8gU3RvcmUgY3NzIHZhbHVlcyBmb3IgZnV0dXJlIGxvb2t1cFxuICAgIHRoaXMuY29udGFpbmVyVG9wUGFkZGluZyA9IHBhcnNlSW50KHRoaXMuJGNvbnRhaW5lci5jc3MoJ3BhZGRpbmctdG9wJyksIDEwKTtcbiAgICB0aGlzLmNvbnRhaW5lclJpZ2h0UGFkZGluZyA9IHBhcnNlSW50KHRoaXMuJGNvbnRhaW5lci5jc3MoJ3BhZGRpbmctcmlnaHQnKSwgMTApO1xuICAgIHRoaXMuY29udGFpbmVyQm90dG9tUGFkZGluZyA9IHBhcnNlSW50KHRoaXMuJGNvbnRhaW5lci5jc3MoJ3BhZGRpbmctYm90dG9tJyksIDEwKTtcbiAgICB0aGlzLmNvbnRhaW5lckxlZnRQYWRkaW5nID0gcGFyc2VJbnQodGhpcy4kY29udGFpbmVyLmNzcygncGFkZGluZy1sZWZ0JyksIDEwKTtcblxuICAgIC8vIEF0dGFjaCBldmVudCBoYW5kbGVycyB0byB0aGUgbmV3bHkgbWludGVkIERPTSBlbGVtZW50c1xuICAgIHRoaXMuJG92ZXJsYXkuaGlkZSgpLm9uKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICAgICAgc2VsZi5lbmQoKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9KTtcblxuICAgIHRoaXMuJGxpZ2h0Ym94LmhpZGUoKS5vbignY2xpY2snLCBmdW5jdGlvbihldmVudCkge1xuICAgICAgaWYgKCQoZXZlbnQudGFyZ2V0KS5hdHRyKCdpZCcpID09PSAnbGlnaHRib3gnKSB7XG4gICAgICAgIHNlbGYuZW5kKCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSk7XG5cbiAgICB0aGlzLiRvdXRlckNvbnRhaW5lci5vbignY2xpY2snLCBmdW5jdGlvbihldmVudCkge1xuICAgICAgaWYgKCQoZXZlbnQudGFyZ2V0KS5hdHRyKCdpZCcpID09PSAnbGlnaHRib3gnKSB7XG4gICAgICAgIHNlbGYuZW5kKCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSk7XG5cbiAgICB0aGlzLiRsaWdodGJveC5maW5kKCcubGItcHJldicpLm9uKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKHNlbGYuY3VycmVudEltYWdlSW5kZXggPT09IDApIHtcbiAgICAgICAgc2VsZi5jaGFuZ2VJbWFnZShzZWxmLmFsYnVtLmxlbmd0aCAtIDEpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc2VsZi5jaGFuZ2VJbWFnZShzZWxmLmN1cnJlbnRJbWFnZUluZGV4IC0gMSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSk7XG5cbiAgICB0aGlzLiRsaWdodGJveC5maW5kKCcubGItbmV4dCcpLm9uKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKHNlbGYuY3VycmVudEltYWdlSW5kZXggPT09IHNlbGYuYWxidW0ubGVuZ3RoIC0gMSkge1xuICAgICAgICBzZWxmLmNoYW5nZUltYWdlKDApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc2VsZi5jaGFuZ2VJbWFnZShzZWxmLmN1cnJlbnRJbWFnZUluZGV4ICsgMSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSk7XG5cbiAgICB0aGlzLiRsaWdodGJveC5maW5kKCcubGItbG9hZGVyLCAubGItY2xvc2UnKS5vbignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgICAgIHNlbGYuZW5kKCk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSk7XG4gIH07XG5cbiAgLy8gU2hvdyBvdmVybGF5IGFuZCBsaWdodGJveC4gSWYgdGhlIGltYWdlIGlzIHBhcnQgb2YgYSBzZXQsIGFkZCBzaWJsaW5ncyB0byBhbGJ1bSBhcnJheS5cbiAgTGlnaHRib3gucHJvdG90eXBlLnN0YXJ0ID0gZnVuY3Rpb24oJGxpbmspIHtcbiAgICB2YXIgc2VsZiAgICA9IHRoaXM7XG4gICAgdmFyICR3aW5kb3cgPSAkKHdpbmRvdyk7XG5cbiAgICAkd2luZG93Lm9uKCdyZXNpemUnLCAkLnByb3h5KHRoaXMuc2l6ZU92ZXJsYXksIHRoaXMpKTtcblxuICAgICQoJ3NlbGVjdCwgb2JqZWN0LCBlbWJlZCcpLmNzcyh7XG4gICAgICB2aXNpYmlsaXR5OiAnaGlkZGVuJ1xuICAgIH0pO1xuXG4gICAgdGhpcy5zaXplT3ZlcmxheSgpO1xuXG4gICAgdGhpcy5hbGJ1bSA9IFtdO1xuICAgIHZhciBpbWFnZU51bWJlciA9IDA7XG5cbiAgICBmdW5jdGlvbiBhZGRUb0FsYnVtKCRsaW5rKSB7XG4gICAgICBzZWxmLmFsYnVtLnB1c2goe1xuICAgICAgICBsaW5rOiAkbGluay5hdHRyKCdocmVmJyksXG4gICAgICAgIHRpdGxlOiAkbGluay5hdHRyKCdkYXRhLXRpdGxlJykgfHwgJGxpbmsuYXR0cigndGl0bGUnKVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gU3VwcG9ydCBib3RoIGRhdGEtbGlnaHRib3ggYXR0cmlidXRlIGFuZCByZWwgYXR0cmlidXRlIGltcGxlbWVudGF0aW9uc1xuICAgIHZhciBkYXRhTGlnaHRib3hWYWx1ZSA9ICRsaW5rLmF0dHIoJ2RhdGEtbGlnaHRib3gnKTtcbiAgICB2YXIgJGxpbmtzO1xuXG4gICAgaWYgKGRhdGFMaWdodGJveFZhbHVlKSB7XG4gICAgICAkbGlua3MgPSAkKCRsaW5rLnByb3AoJ3RhZ05hbWUnKSArICdbZGF0YS1saWdodGJveD1cIicgKyBkYXRhTGlnaHRib3hWYWx1ZSArICdcIl0nKTtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgJGxpbmtzLmxlbmd0aDsgaSA9ICsraSkge1xuICAgICAgICBhZGRUb0FsYnVtKCQoJGxpbmtzW2ldKSk7XG4gICAgICAgIGlmICgkbGlua3NbaV0gPT09ICRsaW5rWzBdKSB7XG4gICAgICAgICAgaW1hZ2VOdW1iZXIgPSBpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICgkbGluay5hdHRyKCdyZWwnKSA9PT0gJ2xpZ2h0Ym94Jykge1xuICAgICAgICAvLyBJZiBpbWFnZSBpcyBub3QgcGFydCBvZiBhIHNldFxuICAgICAgICBhZGRUb0FsYnVtKCRsaW5rKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIElmIGltYWdlIGlzIHBhcnQgb2YgYSBzZXRcbiAgICAgICAgJGxpbmtzID0gJCgkbGluay5wcm9wKCd0YWdOYW1lJykgKyAnW3JlbD1cIicgKyAkbGluay5hdHRyKCdyZWwnKSArICdcIl0nKTtcbiAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCAkbGlua3MubGVuZ3RoOyBqID0gKytqKSB7XG4gICAgICAgICAgYWRkVG9BbGJ1bSgkKCRsaW5rc1tqXSkpO1xuICAgICAgICAgIGlmICgkbGlua3Nbal0gPT09ICRsaW5rWzBdKSB7XG4gICAgICAgICAgICBpbWFnZU51bWJlciA9IGo7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gUG9zaXRpb24gTGlnaHRib3hcbiAgICB2YXIgdG9wICA9ICR3aW5kb3cuc2Nyb2xsVG9wKCkgKyB0aGlzLm9wdGlvbnMucG9zaXRpb25Gcm9tVG9wO1xuICAgIHZhciBsZWZ0ID0gJHdpbmRvdy5zY3JvbGxMZWZ0KCk7XG4gICAgdGhpcy4kbGlnaHRib3guY3NzKHtcbiAgICAgIHRvcDogdG9wICsgJ3B4JyxcbiAgICAgIGxlZnQ6IGxlZnQgKyAncHgnXG4gICAgfSkuZmFkZUluKHRoaXMub3B0aW9ucy5mYWRlRHVyYXRpb24pO1xuXG4gICAgLy8gRGlzYWJsZSBzY3JvbGxpbmcgb2YgdGhlIHBhZ2Ugd2hpbGUgb3BlblxuICAgIGlmICh0aGlzLm9wdGlvbnMuZGlzYWJsZVNjcm9sbGluZykge1xuICAgICAgJCgnYm9keScpLmFkZENsYXNzKCdsYi1kaXNhYmxlLXNjcm9sbGluZycpO1xuICAgIH1cblxuICAgIHRoaXMuY2hhbmdlSW1hZ2UoaW1hZ2VOdW1iZXIpO1xuICB9O1xuXG4gIC8vIEhpZGUgbW9zdCBVSSBlbGVtZW50cyBpbiBwcmVwYXJhdGlvbiBmb3IgdGhlIGFuaW1hdGVkIHJlc2l6aW5nIG9mIHRoZSBsaWdodGJveC5cbiAgTGlnaHRib3gucHJvdG90eXBlLmNoYW5nZUltYWdlID0gZnVuY3Rpb24oaW1hZ2VOdW1iZXIpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICB0aGlzLmRpc2FibGVLZXlib2FyZE5hdigpO1xuICAgIHZhciAkaW1hZ2UgPSB0aGlzLiRsaWdodGJveC5maW5kKCcubGItaW1hZ2UnKTtcblxuICAgIHRoaXMuJG92ZXJsYXkuZmFkZUluKHRoaXMub3B0aW9ucy5mYWRlRHVyYXRpb24pO1xuXG4gICAgJCgnLmxiLWxvYWRlcicpLmZhZGVJbignc2xvdycpO1xuICAgIHRoaXMuJGxpZ2h0Ym94LmZpbmQoJy5sYi1pbWFnZSwgLmxiLW5hdiwgLmxiLXByZXYsIC5sYi1uZXh0LCAubGItZGF0YUNvbnRhaW5lciwgLmxiLW51bWJlcnMsIC5sYi1jYXB0aW9uJykuaGlkZSgpO1xuXG4gICAgdGhpcy4kb3V0ZXJDb250YWluZXIuYWRkQ2xhc3MoJ2FuaW1hdGluZycpO1xuXG4gICAgLy8gV2hlbiBpbWFnZSB0byBzaG93IGlzIHByZWxvYWRlZCwgd2Ugc2VuZCB0aGUgd2lkdGggYW5kIGhlaWdodCB0byBzaXplQ29udGFpbmVyKClcbiAgICB2YXIgcHJlbG9hZGVyID0gbmV3IEltYWdlKCk7XG4gICAgcHJlbG9hZGVyLm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyICRwcmVsb2FkZXI7XG4gICAgICB2YXIgaW1hZ2VIZWlnaHQ7XG4gICAgICB2YXIgaW1hZ2VXaWR0aDtcbiAgICAgIHZhciBtYXhJbWFnZUhlaWdodDtcbiAgICAgIHZhciBtYXhJbWFnZVdpZHRoO1xuICAgICAgdmFyIHdpbmRvd0hlaWdodDtcbiAgICAgIHZhciB3aW5kb3dXaWR0aDtcblxuICAgICAgJGltYWdlLmF0dHIoJ3NyYycsIHNlbGYuYWxidW1baW1hZ2VOdW1iZXJdLmxpbmspO1xuXG4gICAgICAkcHJlbG9hZGVyID0gJChwcmVsb2FkZXIpO1xuXG4gICAgICAkaW1hZ2Uud2lkdGgocHJlbG9hZGVyLndpZHRoKTtcbiAgICAgICRpbWFnZS5oZWlnaHQocHJlbG9hZGVyLmhlaWdodCk7XG5cbiAgICAgIGlmIChzZWxmLm9wdGlvbnMuZml0SW1hZ2VzSW5WaWV3cG9ydCkge1xuICAgICAgICAvLyBGaXQgaW1hZ2UgaW5zaWRlIHRoZSB2aWV3cG9ydC5cbiAgICAgICAgLy8gVGFrZSBpbnRvIGFjY291bnQgdGhlIGJvcmRlciBhcm91bmQgdGhlIGltYWdlIGFuZCBhbiBhZGRpdGlvbmFsIDEwcHggZ3V0dGVyIG9uIGVhY2ggc2lkZS5cblxuICAgICAgICB3aW5kb3dXaWR0aCAgICA9ICQod2luZG93KS53aWR0aCgpO1xuICAgICAgICB3aW5kb3dIZWlnaHQgICA9ICQod2luZG93KS5oZWlnaHQoKTtcbiAgICAgICAgbWF4SW1hZ2VXaWR0aCAgPSB3aW5kb3dXaWR0aCAtIHNlbGYuY29udGFpbmVyTGVmdFBhZGRpbmcgLSBzZWxmLmNvbnRhaW5lclJpZ2h0UGFkZGluZyAtIDIwO1xuICAgICAgICBtYXhJbWFnZUhlaWdodCA9IHdpbmRvd0hlaWdodCAtIHNlbGYuY29udGFpbmVyVG9wUGFkZGluZyAtIHNlbGYuY29udGFpbmVyQm90dG9tUGFkZGluZyAtIDEyMDtcblxuICAgICAgICAvLyBDaGVjayBpZiBpbWFnZSBzaXplIGlzIGxhcmdlciB0aGVuIG1heFdpZHRofG1heEhlaWdodCBpbiBzZXR0aW5nc1xuICAgICAgICBpZiAoc2VsZi5vcHRpb25zLm1heFdpZHRoICYmIHNlbGYub3B0aW9ucy5tYXhXaWR0aCA8IG1heEltYWdlV2lkdGgpIHtcbiAgICAgICAgICBtYXhJbWFnZVdpZHRoID0gc2VsZi5vcHRpb25zLm1heFdpZHRoO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzZWxmLm9wdGlvbnMubWF4SGVpZ2h0ICYmIHNlbGYub3B0aW9ucy5tYXhIZWlnaHQgPCBtYXhJbWFnZVdpZHRoKSB7XG4gICAgICAgICAgbWF4SW1hZ2VIZWlnaHQgPSBzZWxmLm9wdGlvbnMubWF4SGVpZ2h0O1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSXMgdGhlcmUgYSBmaXR0aW5nIGlzc3VlP1xuICAgICAgICBpZiAoKHByZWxvYWRlci53aWR0aCA+IG1heEltYWdlV2lkdGgpIHx8IChwcmVsb2FkZXIuaGVpZ2h0ID4gbWF4SW1hZ2VIZWlnaHQpKSB7XG4gICAgICAgICAgaWYgKChwcmVsb2FkZXIud2lkdGggLyBtYXhJbWFnZVdpZHRoKSA+IChwcmVsb2FkZXIuaGVpZ2h0IC8gbWF4SW1hZ2VIZWlnaHQpKSB7XG4gICAgICAgICAgICBpbWFnZVdpZHRoICA9IG1heEltYWdlV2lkdGg7XG4gICAgICAgICAgICBpbWFnZUhlaWdodCA9IHBhcnNlSW50KHByZWxvYWRlci5oZWlnaHQgLyAocHJlbG9hZGVyLndpZHRoIC8gaW1hZ2VXaWR0aCksIDEwKTtcbiAgICAgICAgICAgICRpbWFnZS53aWR0aChpbWFnZVdpZHRoKTtcbiAgICAgICAgICAgICRpbWFnZS5oZWlnaHQoaW1hZ2VIZWlnaHQpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpbWFnZUhlaWdodCA9IG1heEltYWdlSGVpZ2h0O1xuICAgICAgICAgICAgaW1hZ2VXaWR0aCA9IHBhcnNlSW50KHByZWxvYWRlci53aWR0aCAvIChwcmVsb2FkZXIuaGVpZ2h0IC8gaW1hZ2VIZWlnaHQpLCAxMCk7XG4gICAgICAgICAgICAkaW1hZ2Uud2lkdGgoaW1hZ2VXaWR0aCk7XG4gICAgICAgICAgICAkaW1hZ2UuaGVpZ2h0KGltYWdlSGVpZ2h0KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHNlbGYuc2l6ZUNvbnRhaW5lcigkaW1hZ2Uud2lkdGgoKSwgJGltYWdlLmhlaWdodCgpKTtcbiAgICB9O1xuXG4gICAgcHJlbG9hZGVyLnNyYyAgICAgICAgICA9IHRoaXMuYWxidW1baW1hZ2VOdW1iZXJdLmxpbms7XG4gICAgdGhpcy5jdXJyZW50SW1hZ2VJbmRleCA9IGltYWdlTnVtYmVyO1xuICB9O1xuXG4gIC8vIFN0cmV0Y2ggb3ZlcmxheSB0byBmaXQgdGhlIHZpZXdwb3J0XG4gIExpZ2h0Ym94LnByb3RvdHlwZS5zaXplT3ZlcmxheSA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuJG92ZXJsYXlcbiAgICAgIC53aWR0aCgkKGRvY3VtZW50KS53aWR0aCgpKVxuICAgICAgLmhlaWdodCgkKGRvY3VtZW50KS5oZWlnaHQoKSk7XG4gIH07XG5cbiAgLy8gQW5pbWF0ZSB0aGUgc2l6ZSBvZiB0aGUgbGlnaHRib3ggdG8gZml0IHRoZSBpbWFnZSB3ZSBhcmUgc2hvd2luZ1xuICBMaWdodGJveC5wcm90b3R5cGUuc2l6ZUNvbnRhaW5lciA9IGZ1bmN0aW9uKGltYWdlV2lkdGgsIGltYWdlSGVpZ2h0KSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgdmFyIG9sZFdpZHRoICA9IHRoaXMuJG91dGVyQ29udGFpbmVyLm91dGVyV2lkdGgoKTtcbiAgICB2YXIgb2xkSGVpZ2h0ID0gdGhpcy4kb3V0ZXJDb250YWluZXIub3V0ZXJIZWlnaHQoKTtcbiAgICB2YXIgbmV3V2lkdGggID0gaW1hZ2VXaWR0aCArIHRoaXMuY29udGFpbmVyTGVmdFBhZGRpbmcgKyB0aGlzLmNvbnRhaW5lclJpZ2h0UGFkZGluZztcbiAgICB2YXIgbmV3SGVpZ2h0ID0gaW1hZ2VIZWlnaHQgKyB0aGlzLmNvbnRhaW5lclRvcFBhZGRpbmcgKyB0aGlzLmNvbnRhaW5lckJvdHRvbVBhZGRpbmc7XG5cbiAgICBmdW5jdGlvbiBwb3N0UmVzaXplKCkge1xuICAgICAgc2VsZi4kbGlnaHRib3guZmluZCgnLmxiLWRhdGFDb250YWluZXInKS53aWR0aChuZXdXaWR0aCk7XG4gICAgICBzZWxmLiRsaWdodGJveC5maW5kKCcubGItcHJldkxpbmsnKS5oZWlnaHQobmV3SGVpZ2h0KTtcbiAgICAgIHNlbGYuJGxpZ2h0Ym94LmZpbmQoJy5sYi1uZXh0TGluaycpLmhlaWdodChuZXdIZWlnaHQpO1xuICAgICAgc2VsZi5zaG93SW1hZ2UoKTtcbiAgICB9XG5cbiAgICBpZiAob2xkV2lkdGggIT09IG5ld1dpZHRoIHx8IG9sZEhlaWdodCAhPT0gbmV3SGVpZ2h0KSB7XG4gICAgICB0aGlzLiRvdXRlckNvbnRhaW5lci5hbmltYXRlKHtcbiAgICAgICAgd2lkdGg6IG5ld1dpZHRoLFxuICAgICAgICBoZWlnaHQ6IG5ld0hlaWdodFxuICAgICAgfSwgdGhpcy5vcHRpb25zLnJlc2l6ZUR1cmF0aW9uLCAnc3dpbmcnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgcG9zdFJlc2l6ZSgpO1xuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHBvc3RSZXNpemUoKTtcbiAgICB9XG4gIH07XG5cbiAgLy8gRGlzcGxheSB0aGUgaW1hZ2UgYW5kIGl0cyBkZXRhaWxzIGFuZCBiZWdpbiBwcmVsb2FkIG5laWdoYm9yaW5nIGltYWdlcy5cbiAgTGlnaHRib3gucHJvdG90eXBlLnNob3dJbWFnZSA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuJGxpZ2h0Ym94LmZpbmQoJy5sYi1sb2FkZXInKS5zdG9wKHRydWUpLmhpZGUoKTtcbiAgICB0aGlzLiRsaWdodGJveC5maW5kKCcubGItaW1hZ2UnKS5mYWRlSW4oJ3Nsb3cnKTtcblxuICAgIHRoaXMudXBkYXRlTmF2KCk7XG4gICAgdGhpcy51cGRhdGVEZXRhaWxzKCk7XG4gICAgdGhpcy5wcmVsb2FkTmVpZ2hib3JpbmdJbWFnZXMoKTtcbiAgICB0aGlzLmVuYWJsZUtleWJvYXJkTmF2KCk7XG4gIH07XG5cbiAgLy8gRGlzcGxheSBwcmV2aW91cyBhbmQgbmV4dCBuYXZpZ2F0aW9uIGlmIGFwcHJvcHJpYXRlLlxuICBMaWdodGJveC5wcm90b3R5cGUudXBkYXRlTmF2ID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gQ2hlY2sgdG8gc2VlIGlmIHRoZSBicm93c2VyIHN1cHBvcnRzIHRvdWNoIGV2ZW50cy4gSWYgc28sIHdlIHRha2UgdGhlIGNvbnNlcnZhdGl2ZSBhcHByb2FjaFxuICAgIC8vIGFuZCBhc3N1bWUgdGhhdCBtb3VzZSBob3ZlciBldmVudHMgYXJlIG5vdCBzdXBwb3J0ZWQgYW5kIGFsd2F5cyBzaG93IHByZXYvbmV4dCBuYXZpZ2F0aW9uXG4gICAgLy8gYXJyb3dzIGluIGltYWdlIHNldHMuXG4gICAgdmFyIGFsd2F5c1Nob3dOYXYgPSBmYWxzZTtcbiAgICB0cnkge1xuICAgICAgZG9jdW1lbnQuY3JlYXRlRXZlbnQoJ1RvdWNoRXZlbnQnKTtcbiAgICAgIGFsd2F5c1Nob3dOYXYgPSAodGhpcy5vcHRpb25zLmFsd2F5c1Nob3dOYXZPblRvdWNoRGV2aWNlcykgPyB0cnVlIDogZmFsc2U7XG4gICAgfSBjYXRjaCAoZSkge31cblxuICAgIHRoaXMuJGxpZ2h0Ym94LmZpbmQoJy5sYi1uYXYnKS5zaG93KCk7XG5cbiAgICBpZiAodGhpcy5hbGJ1bS5sZW5ndGggPiAxKSB7XG4gICAgICBpZiAodGhpcy5vcHRpb25zLndyYXBBcm91bmQpIHtcbiAgICAgICAgaWYgKGFsd2F5c1Nob3dOYXYpIHtcbiAgICAgICAgICB0aGlzLiRsaWdodGJveC5maW5kKCcubGItcHJldiwgLmxiLW5leHQnKS5jc3MoJ29wYWNpdHknLCAnMScpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuJGxpZ2h0Ym94LmZpbmQoJy5sYi1wcmV2LCAubGItbmV4dCcpLnNob3coKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmICh0aGlzLmN1cnJlbnRJbWFnZUluZGV4ID4gMCkge1xuICAgICAgICAgIHRoaXMuJGxpZ2h0Ym94LmZpbmQoJy5sYi1wcmV2Jykuc2hvdygpO1xuICAgICAgICAgIGlmIChhbHdheXNTaG93TmF2KSB7XG4gICAgICAgICAgICB0aGlzLiRsaWdodGJveC5maW5kKCcubGItcHJldicpLmNzcygnb3BhY2l0eScsICcxJyk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLmN1cnJlbnRJbWFnZUluZGV4IDwgdGhpcy5hbGJ1bS5sZW5ndGggLSAxKSB7XG4gICAgICAgICAgdGhpcy4kbGlnaHRib3guZmluZCgnLmxiLW5leHQnKS5zaG93KCk7XG4gICAgICAgICAgaWYgKGFsd2F5c1Nob3dOYXYpIHtcbiAgICAgICAgICAgIHRoaXMuJGxpZ2h0Ym94LmZpbmQoJy5sYi1uZXh0JykuY3NzKCdvcGFjaXR5JywgJzEnKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH07XG5cbiAgLy8gRGlzcGxheSBjYXB0aW9uLCBpbWFnZSBudW1iZXIsIGFuZCBjbG9zaW5nIGJ1dHRvbi5cbiAgTGlnaHRib3gucHJvdG90eXBlLnVwZGF0ZURldGFpbHMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAvLyBFbmFibGUgYW5jaG9yIGNsaWNrcyBpbiB0aGUgaW5qZWN0ZWQgY2FwdGlvbiBodG1sLlxuICAgIC8vIFRoYW5rcyBOYXRlIFdyaWdodCBmb3IgdGhlIGZpeC4gQGh0dHBzOi8vZ2l0aHViLmNvbS9OYXRlV3JcbiAgICBpZiAodHlwZW9mIHRoaXMuYWxidW1bdGhpcy5jdXJyZW50SW1hZ2VJbmRleF0udGl0bGUgIT09ICd1bmRlZmluZWQnICYmXG4gICAgICB0aGlzLmFsYnVtW3RoaXMuY3VycmVudEltYWdlSW5kZXhdLnRpdGxlICE9PSAnJykge1xuICAgICAgdGhpcy4kbGlnaHRib3guZmluZCgnLmxiLWNhcHRpb24nKVxuICAgICAgICAuaHRtbCh0aGlzLmFsYnVtW3RoaXMuY3VycmVudEltYWdlSW5kZXhdLnRpdGxlKVxuICAgICAgICAuZmFkZUluKCdmYXN0JylcbiAgICAgICAgLmZpbmQoJ2EnKS5vbignY2xpY2snLCBmdW5jdGlvbihldmVudCkge1xuICAgICAgICAgIGlmICgkKHRoaXMpLmF0dHIoJ3RhcmdldCcpICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHdpbmRvdy5vcGVuKCQodGhpcykuYXR0cignaHJlZicpLCAkKHRoaXMpLmF0dHIoJ3RhcmdldCcpKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbG9jYXRpb24uaHJlZiA9ICQodGhpcykuYXR0cignaHJlZicpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuYWxidW0ubGVuZ3RoID4gMSAmJiB0aGlzLm9wdGlvbnMuc2hvd0ltYWdlTnVtYmVyTGFiZWwpIHtcbiAgICAgIHZhciBsYWJlbFRleHQgPSB0aGlzLmltYWdlQ291bnRMYWJlbCh0aGlzLmN1cnJlbnRJbWFnZUluZGV4ICsgMSwgdGhpcy5hbGJ1bS5sZW5ndGgpO1xuICAgICAgdGhpcy4kbGlnaHRib3guZmluZCgnLmxiLW51bWJlcicpLnRleHQobGFiZWxUZXh0KS5mYWRlSW4oJ2Zhc3QnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy4kbGlnaHRib3guZmluZCgnLmxiLW51bWJlcicpLmhpZGUoKTtcbiAgICB9XG5cbiAgICB0aGlzLiRvdXRlckNvbnRhaW5lci5yZW1vdmVDbGFzcygnYW5pbWF0aW5nJyk7XG5cbiAgICB0aGlzLiRsaWdodGJveC5maW5kKCcubGItZGF0YUNvbnRhaW5lcicpLmZhZGVJbih0aGlzLm9wdGlvbnMucmVzaXplRHVyYXRpb24sIGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHNlbGYuc2l6ZU92ZXJsYXkoKTtcbiAgICB9KTtcbiAgfTtcblxuICAvLyBQcmVsb2FkIHByZXZpb3VzIGFuZCBuZXh0IGltYWdlcyBpbiBzZXQuXG4gIExpZ2h0Ym94LnByb3RvdHlwZS5wcmVsb2FkTmVpZ2hib3JpbmdJbWFnZXMgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5hbGJ1bS5sZW5ndGggPiB0aGlzLmN1cnJlbnRJbWFnZUluZGV4ICsgMSkge1xuICAgICAgdmFyIHByZWxvYWROZXh0ID0gbmV3IEltYWdlKCk7XG4gICAgICBwcmVsb2FkTmV4dC5zcmMgPSB0aGlzLmFsYnVtW3RoaXMuY3VycmVudEltYWdlSW5kZXggKyAxXS5saW5rO1xuICAgIH1cbiAgICBpZiAodGhpcy5jdXJyZW50SW1hZ2VJbmRleCA+IDApIHtcbiAgICAgIHZhciBwcmVsb2FkUHJldiA9IG5ldyBJbWFnZSgpO1xuICAgICAgcHJlbG9hZFByZXYuc3JjID0gdGhpcy5hbGJ1bVt0aGlzLmN1cnJlbnRJbWFnZUluZGV4IC0gMV0ubGluaztcbiAgICB9XG4gIH07XG5cbiAgTGlnaHRib3gucHJvdG90eXBlLmVuYWJsZUtleWJvYXJkTmF2ID0gZnVuY3Rpb24oKSB7XG4gICAgJChkb2N1bWVudCkub24oJ2tleXVwLmtleWJvYXJkJywgJC5wcm94eSh0aGlzLmtleWJvYXJkQWN0aW9uLCB0aGlzKSk7XG4gIH07XG5cbiAgTGlnaHRib3gucHJvdG90eXBlLmRpc2FibGVLZXlib2FyZE5hdiA9IGZ1bmN0aW9uKCkge1xuICAgICQoZG9jdW1lbnQpLm9mZignLmtleWJvYXJkJyk7XG4gIH07XG5cbiAgTGlnaHRib3gucHJvdG90eXBlLmtleWJvYXJkQWN0aW9uID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgICB2YXIgS0VZQ09ERV9FU0MgICAgICAgID0gMjc7XG4gICAgdmFyIEtFWUNPREVfTEVGVEFSUk9XICA9IDM3O1xuICAgIHZhciBLRVlDT0RFX1JJR0hUQVJST1cgPSAzOTtcblxuICAgIHZhciBrZXljb2RlID0gZXZlbnQua2V5Q29kZTtcbiAgICB2YXIga2V5ICAgICA9IFN0cmluZy5mcm9tQ2hhckNvZGUoa2V5Y29kZSkudG9Mb3dlckNhc2UoKTtcbiAgICBpZiAoa2V5Y29kZSA9PT0gS0VZQ09ERV9FU0MgfHwga2V5Lm1hdGNoKC94fG98Yy8pKSB7XG4gICAgICB0aGlzLmVuZCgpO1xuICAgIH0gZWxzZSBpZiAoa2V5ID09PSAncCcgfHwga2V5Y29kZSA9PT0gS0VZQ09ERV9MRUZUQVJST1cpIHtcbiAgICAgIGlmICh0aGlzLmN1cnJlbnRJbWFnZUluZGV4ICE9PSAwKSB7XG4gICAgICAgIHRoaXMuY2hhbmdlSW1hZ2UodGhpcy5jdXJyZW50SW1hZ2VJbmRleCAtIDEpO1xuICAgICAgfSBlbHNlIGlmICh0aGlzLm9wdGlvbnMud3JhcEFyb3VuZCAmJiB0aGlzLmFsYnVtLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgdGhpcy5jaGFuZ2VJbWFnZSh0aGlzLmFsYnVtLmxlbmd0aCAtIDEpO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoa2V5ID09PSAnbicgfHwga2V5Y29kZSA9PT0gS0VZQ09ERV9SSUdIVEFSUk9XKSB7XG4gICAgICBpZiAodGhpcy5jdXJyZW50SW1hZ2VJbmRleCAhPT0gdGhpcy5hbGJ1bS5sZW5ndGggLSAxKSB7XG4gICAgICAgIHRoaXMuY2hhbmdlSW1hZ2UodGhpcy5jdXJyZW50SW1hZ2VJbmRleCArIDEpO1xuICAgICAgfSBlbHNlIGlmICh0aGlzLm9wdGlvbnMud3JhcEFyb3VuZCAmJiB0aGlzLmFsYnVtLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgdGhpcy5jaGFuZ2VJbWFnZSgwKTtcbiAgICAgIH1cbiAgICB9XG4gIH07XG5cbiAgLy8gQ2xvc2luZyB0aW1lLiA6LShcbiAgTGlnaHRib3gucHJvdG90eXBlLmVuZCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuZGlzYWJsZUtleWJvYXJkTmF2KCk7XG4gICAgJCh3aW5kb3cpLm9mZigncmVzaXplJywgdGhpcy5zaXplT3ZlcmxheSk7XG4gICAgdGhpcy4kbGlnaHRib3guZmFkZU91dCh0aGlzLm9wdGlvbnMuZmFkZUR1cmF0aW9uKTtcbiAgICB0aGlzLiRvdmVybGF5LmZhZGVPdXQodGhpcy5vcHRpb25zLmZhZGVEdXJhdGlvbik7XG4gICAgJCgnc2VsZWN0LCBvYmplY3QsIGVtYmVkJykuY3NzKHtcbiAgICAgIHZpc2liaWxpdHk6ICd2aXNpYmxlJ1xuICAgIH0pO1xuICAgIGlmICh0aGlzLm9wdGlvbnMuZGlzYWJsZVNjcm9sbGluZykge1xuICAgICAgJCgnYm9keScpLnJlbW92ZUNsYXNzKCdsYi1kaXNhYmxlLXNjcm9sbGluZycpO1xuICAgIH1cbiAgfTtcblxuICByZXR1cm4gbmV3IExpZ2h0Ym94KCk7XG59KSk7XG4iLCIvKlxuICAgICBfIF8gICAgICBfICAgICAgIF9cbiBfX198IChfKSBfX198IHwgX18gIChfKV9fX1xuLyBfX3wgfCB8LyBfX3wgfC8gLyAgfCAvIF9ffFxuXFxfXyBcXCB8IHwgKF9ffCAgIDwgXyB8IFxcX18gXFxcbnxfX18vX3xffFxcX19ffF98XFxfKF8pLyB8X19fL1xuICAgICAgICAgICAgICAgICAgIHxfXy9cblxuIFZlcnNpb246IDEuNS45XG4gIEF1dGhvcjogS2VuIFdoZWVsZXJcbiBXZWJzaXRlOiBodHRwOi8va2Vud2hlZWxlci5naXRodWIuaW9cbiAgICBEb2NzOiBodHRwOi8va2Vud2hlZWxlci5naXRodWIuaW8vc2xpY2tcbiAgICBSZXBvOiBodHRwOi8vZ2l0aHViLmNvbS9rZW53aGVlbGVyL3NsaWNrXG4gIElzc3VlczogaHR0cDovL2dpdGh1Yi5jb20va2Vud2hlZWxlci9zbGljay9pc3N1ZXNcblxuICovXG4hZnVuY3Rpb24oYSl7XCJ1c2Ugc3RyaWN0XCI7XCJmdW5jdGlvblwiPT10eXBlb2YgZGVmaW5lJiZkZWZpbmUuYW1kP2RlZmluZShbXCJqcXVlcnlcIl0sYSk6XCJ1bmRlZmluZWRcIiE9dHlwZW9mIGV4cG9ydHM/bW9kdWxlLmV4cG9ydHM9YShyZXF1aXJlKFwianF1ZXJ5XCIpKTphKGpRdWVyeSl9KGZ1bmN0aW9uKGEpe1widXNlIHN0cmljdFwiO3ZhciBiPXdpbmRvdy5TbGlja3x8e307Yj1mdW5jdGlvbigpe2Z1bmN0aW9uIGMoYyxkKXt2YXIgZixlPXRoaXM7ZS5kZWZhdWx0cz17YWNjZXNzaWJpbGl0eTohMCxhZGFwdGl2ZUhlaWdodDohMSxhcHBlbmRBcnJvd3M6YShjKSxhcHBlbmREb3RzOmEoYyksYXJyb3dzOiEwLGFzTmF2Rm9yOm51bGwscHJldkFycm93Oic8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBkYXRhLXJvbGU9XCJub25lXCIgY2xhc3M9XCJzbGljay1wcmV2XCIgYXJpYS1sYWJlbD1cIlByZXZpb3VzXCIgdGFiaW5kZXg9XCIwXCIgcm9sZT1cImJ1dHRvblwiPlByZXZpb3VzPC9idXR0b24+JyxuZXh0QXJyb3c6JzxidXR0b24gdHlwZT1cImJ1dHRvblwiIGRhdGEtcm9sZT1cIm5vbmVcIiBjbGFzcz1cInNsaWNrLW5leHRcIiBhcmlhLWxhYmVsPVwiTmV4dFwiIHRhYmluZGV4PVwiMFwiIHJvbGU9XCJidXR0b25cIj5OZXh0PC9idXR0b24+JyxhdXRvcGxheTohMSxhdXRvcGxheVNwZWVkOjNlMyxjZW50ZXJNb2RlOiExLGNlbnRlclBhZGRpbmc6XCI1MHB4XCIsY3NzRWFzZTpcImVhc2VcIixjdXN0b21QYWdpbmc6ZnVuY3Rpb24oYSxiKXtyZXR1cm4nPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgZGF0YS1yb2xlPVwibm9uZVwiIHJvbGU9XCJidXR0b25cIiBhcmlhLXJlcXVpcmVkPVwiZmFsc2VcIiB0YWJpbmRleD1cIjBcIj4nKyhiKzEpK1wiPC9idXR0b24+XCJ9LGRvdHM6ITEsZG90c0NsYXNzOlwic2xpY2stZG90c1wiLGRyYWdnYWJsZTohMCxlYXNpbmc6XCJsaW5lYXJcIixlZGdlRnJpY3Rpb246LjM1LGZhZGU6ITEsZm9jdXNPblNlbGVjdDohMSxpbmZpbml0ZTohMCxpbml0aWFsU2xpZGU6MCxsYXp5TG9hZDpcIm9uZGVtYW5kXCIsbW9iaWxlRmlyc3Q6ITEscGF1c2VPbkhvdmVyOiEwLHBhdXNlT25Eb3RzSG92ZXI6ITEscmVzcG9uZFRvOlwid2luZG93XCIscmVzcG9uc2l2ZTpudWxsLHJvd3M6MSxydGw6ITEsc2xpZGU6XCJcIixzbGlkZXNQZXJSb3c6MSxzbGlkZXNUb1Nob3c6MSxzbGlkZXNUb1Njcm9sbDoxLHNwZWVkOjUwMCxzd2lwZTohMCxzd2lwZVRvU2xpZGU6ITEsdG91Y2hNb3ZlOiEwLHRvdWNoVGhyZXNob2xkOjUsdXNlQ1NTOiEwLHVzZVRyYW5zZm9ybTohMCx2YXJpYWJsZVdpZHRoOiExLHZlcnRpY2FsOiExLHZlcnRpY2FsU3dpcGluZzohMSx3YWl0Rm9yQW5pbWF0ZTohMCx6SW5kZXg6MWUzfSxlLmluaXRpYWxzPXthbmltYXRpbmc6ITEsZHJhZ2dpbmc6ITEsYXV0b1BsYXlUaW1lcjpudWxsLGN1cnJlbnREaXJlY3Rpb246MCxjdXJyZW50TGVmdDpudWxsLGN1cnJlbnRTbGlkZTowLGRpcmVjdGlvbjoxLCRkb3RzOm51bGwsbGlzdFdpZHRoOm51bGwsbGlzdEhlaWdodDpudWxsLGxvYWRJbmRleDowLCRuZXh0QXJyb3c6bnVsbCwkcHJldkFycm93Om51bGwsc2xpZGVDb3VudDpudWxsLHNsaWRlV2lkdGg6bnVsbCwkc2xpZGVUcmFjazpudWxsLCRzbGlkZXM6bnVsbCxzbGlkaW5nOiExLHNsaWRlT2Zmc2V0OjAsc3dpcGVMZWZ0Om51bGwsJGxpc3Q6bnVsbCx0b3VjaE9iamVjdDp7fSx0cmFuc2Zvcm1zRW5hYmxlZDohMSx1bnNsaWNrZWQ6ITF9LGEuZXh0ZW5kKGUsZS5pbml0aWFscyksZS5hY3RpdmVCcmVha3BvaW50PW51bGwsZS5hbmltVHlwZT1udWxsLGUuYW5pbVByb3A9bnVsbCxlLmJyZWFrcG9pbnRzPVtdLGUuYnJlYWtwb2ludFNldHRpbmdzPVtdLGUuY3NzVHJhbnNpdGlvbnM9ITEsZS5oaWRkZW49XCJoaWRkZW5cIixlLnBhdXNlZD0hMSxlLnBvc2l0aW9uUHJvcD1udWxsLGUucmVzcG9uZFRvPW51bGwsZS5yb3dDb3VudD0xLGUuc2hvdWxkQ2xpY2s9ITAsZS4kc2xpZGVyPWEoYyksZS4kc2xpZGVzQ2FjaGU9bnVsbCxlLnRyYW5zZm9ybVR5cGU9bnVsbCxlLnRyYW5zaXRpb25UeXBlPW51bGwsZS52aXNpYmlsaXR5Q2hhbmdlPVwidmlzaWJpbGl0eWNoYW5nZVwiLGUud2luZG93V2lkdGg9MCxlLndpbmRvd1RpbWVyPW51bGwsZj1hKGMpLmRhdGEoXCJzbGlja1wiKXx8e30sZS5vcHRpb25zPWEuZXh0ZW5kKHt9LGUuZGVmYXVsdHMsZixkKSxlLmN1cnJlbnRTbGlkZT1lLm9wdGlvbnMuaW5pdGlhbFNsaWRlLGUub3JpZ2luYWxTZXR0aW5ncz1lLm9wdGlvbnMsXCJ1bmRlZmluZWRcIiE9dHlwZW9mIGRvY3VtZW50Lm1vekhpZGRlbj8oZS5oaWRkZW49XCJtb3pIaWRkZW5cIixlLnZpc2liaWxpdHlDaGFuZ2U9XCJtb3p2aXNpYmlsaXR5Y2hhbmdlXCIpOlwidW5kZWZpbmVkXCIhPXR5cGVvZiBkb2N1bWVudC53ZWJraXRIaWRkZW4mJihlLmhpZGRlbj1cIndlYmtpdEhpZGRlblwiLGUudmlzaWJpbGl0eUNoYW5nZT1cIndlYmtpdHZpc2liaWxpdHljaGFuZ2VcIiksZS5hdXRvUGxheT1hLnByb3h5KGUuYXV0b1BsYXksZSksZS5hdXRvUGxheUNsZWFyPWEucHJveHkoZS5hdXRvUGxheUNsZWFyLGUpLGUuY2hhbmdlU2xpZGU9YS5wcm94eShlLmNoYW5nZVNsaWRlLGUpLGUuY2xpY2tIYW5kbGVyPWEucHJveHkoZS5jbGlja0hhbmRsZXIsZSksZS5zZWxlY3RIYW5kbGVyPWEucHJveHkoZS5zZWxlY3RIYW5kbGVyLGUpLGUuc2V0UG9zaXRpb249YS5wcm94eShlLnNldFBvc2l0aW9uLGUpLGUuc3dpcGVIYW5kbGVyPWEucHJveHkoZS5zd2lwZUhhbmRsZXIsZSksZS5kcmFnSGFuZGxlcj1hLnByb3h5KGUuZHJhZ0hhbmRsZXIsZSksZS5rZXlIYW5kbGVyPWEucHJveHkoZS5rZXlIYW5kbGVyLGUpLGUuYXV0b1BsYXlJdGVyYXRvcj1hLnByb3h5KGUuYXV0b1BsYXlJdGVyYXRvcixlKSxlLmluc3RhbmNlVWlkPWIrKyxlLmh0bWxFeHByPS9eKD86XFxzKig8W1xcd1xcV10rPilbXj5dKikkLyxlLnJlZ2lzdGVyQnJlYWtwb2ludHMoKSxlLmluaXQoITApLGUuY2hlY2tSZXNwb25zaXZlKCEwKX12YXIgYj0wO3JldHVybiBjfSgpLGIucHJvdG90eXBlLmFkZFNsaWRlPWIucHJvdG90eXBlLnNsaWNrQWRkPWZ1bmN0aW9uKGIsYyxkKXt2YXIgZT10aGlzO2lmKFwiYm9vbGVhblwiPT10eXBlb2YgYylkPWMsYz1udWxsO2Vsc2UgaWYoMD5jfHxjPj1lLnNsaWRlQ291bnQpcmV0dXJuITE7ZS51bmxvYWQoKSxcIm51bWJlclwiPT10eXBlb2YgYz8wPT09YyYmMD09PWUuJHNsaWRlcy5sZW5ndGg/YShiKS5hcHBlbmRUbyhlLiRzbGlkZVRyYWNrKTpkP2EoYikuaW5zZXJ0QmVmb3JlKGUuJHNsaWRlcy5lcShjKSk6YShiKS5pbnNlcnRBZnRlcihlLiRzbGlkZXMuZXEoYykpOmQ9PT0hMD9hKGIpLnByZXBlbmRUbyhlLiRzbGlkZVRyYWNrKTphKGIpLmFwcGVuZFRvKGUuJHNsaWRlVHJhY2spLGUuJHNsaWRlcz1lLiRzbGlkZVRyYWNrLmNoaWxkcmVuKHRoaXMub3B0aW9ucy5zbGlkZSksZS4kc2xpZGVUcmFjay5jaGlsZHJlbih0aGlzLm9wdGlvbnMuc2xpZGUpLmRldGFjaCgpLGUuJHNsaWRlVHJhY2suYXBwZW5kKGUuJHNsaWRlcyksZS4kc2xpZGVzLmVhY2goZnVuY3Rpb24oYixjKXthKGMpLmF0dHIoXCJkYXRhLXNsaWNrLWluZGV4XCIsYil9KSxlLiRzbGlkZXNDYWNoZT1lLiRzbGlkZXMsZS5yZWluaXQoKX0sYi5wcm90b3R5cGUuYW5pbWF0ZUhlaWdodD1mdW5jdGlvbigpe3ZhciBhPXRoaXM7aWYoMT09PWEub3B0aW9ucy5zbGlkZXNUb1Nob3cmJmEub3B0aW9ucy5hZGFwdGl2ZUhlaWdodD09PSEwJiZhLm9wdGlvbnMudmVydGljYWw9PT0hMSl7dmFyIGI9YS4kc2xpZGVzLmVxKGEuY3VycmVudFNsaWRlKS5vdXRlckhlaWdodCghMCk7YS4kbGlzdC5hbmltYXRlKHtoZWlnaHQ6Yn0sYS5vcHRpb25zLnNwZWVkKX19LGIucHJvdG90eXBlLmFuaW1hdGVTbGlkZT1mdW5jdGlvbihiLGMpe3ZhciBkPXt9LGU9dGhpcztlLmFuaW1hdGVIZWlnaHQoKSxlLm9wdGlvbnMucnRsPT09ITAmJmUub3B0aW9ucy52ZXJ0aWNhbD09PSExJiYoYj0tYiksZS50cmFuc2Zvcm1zRW5hYmxlZD09PSExP2Uub3B0aW9ucy52ZXJ0aWNhbD09PSExP2UuJHNsaWRlVHJhY2suYW5pbWF0ZSh7bGVmdDpifSxlLm9wdGlvbnMuc3BlZWQsZS5vcHRpb25zLmVhc2luZyxjKTplLiRzbGlkZVRyYWNrLmFuaW1hdGUoe3RvcDpifSxlLm9wdGlvbnMuc3BlZWQsZS5vcHRpb25zLmVhc2luZyxjKTplLmNzc1RyYW5zaXRpb25zPT09ITE/KGUub3B0aW9ucy5ydGw9PT0hMCYmKGUuY3VycmVudExlZnQ9LWUuY3VycmVudExlZnQpLGEoe2FuaW1TdGFydDplLmN1cnJlbnRMZWZ0fSkuYW5pbWF0ZSh7YW5pbVN0YXJ0OmJ9LHtkdXJhdGlvbjplLm9wdGlvbnMuc3BlZWQsZWFzaW5nOmUub3B0aW9ucy5lYXNpbmcsc3RlcDpmdW5jdGlvbihhKXthPU1hdGguY2VpbChhKSxlLm9wdGlvbnMudmVydGljYWw9PT0hMT8oZFtlLmFuaW1UeXBlXT1cInRyYW5zbGF0ZShcIithK1wicHgsIDBweClcIixlLiRzbGlkZVRyYWNrLmNzcyhkKSk6KGRbZS5hbmltVHlwZV09XCJ0cmFuc2xhdGUoMHB4LFwiK2ErXCJweClcIixlLiRzbGlkZVRyYWNrLmNzcyhkKSl9LGNvbXBsZXRlOmZ1bmN0aW9uKCl7YyYmYy5jYWxsKCl9fSkpOihlLmFwcGx5VHJhbnNpdGlvbigpLGI9TWF0aC5jZWlsKGIpLGUub3B0aW9ucy52ZXJ0aWNhbD09PSExP2RbZS5hbmltVHlwZV09XCJ0cmFuc2xhdGUzZChcIitiK1wicHgsIDBweCwgMHB4KVwiOmRbZS5hbmltVHlwZV09XCJ0cmFuc2xhdGUzZCgwcHgsXCIrYitcInB4LCAwcHgpXCIsZS4kc2xpZGVUcmFjay5jc3MoZCksYyYmc2V0VGltZW91dChmdW5jdGlvbigpe2UuZGlzYWJsZVRyYW5zaXRpb24oKSxjLmNhbGwoKX0sZS5vcHRpb25zLnNwZWVkKSl9LGIucHJvdG90eXBlLmFzTmF2Rm9yPWZ1bmN0aW9uKGIpe3ZhciBjPXRoaXMsZD1jLm9wdGlvbnMuYXNOYXZGb3I7ZCYmbnVsbCE9PWQmJihkPWEoZCkubm90KGMuJHNsaWRlcikpLG51bGwhPT1kJiZcIm9iamVjdFwiPT10eXBlb2YgZCYmZC5lYWNoKGZ1bmN0aW9uKCl7dmFyIGM9YSh0aGlzKS5zbGljayhcImdldFNsaWNrXCIpO2MudW5zbGlja2VkfHxjLnNsaWRlSGFuZGxlcihiLCEwKX0pfSxiLnByb3RvdHlwZS5hcHBseVRyYW5zaXRpb249ZnVuY3Rpb24oYSl7dmFyIGI9dGhpcyxjPXt9O2Iub3B0aW9ucy5mYWRlPT09ITE/Y1tiLnRyYW5zaXRpb25UeXBlXT1iLnRyYW5zZm9ybVR5cGUrXCIgXCIrYi5vcHRpb25zLnNwZWVkK1wibXMgXCIrYi5vcHRpb25zLmNzc0Vhc2U6Y1tiLnRyYW5zaXRpb25UeXBlXT1cIm9wYWNpdHkgXCIrYi5vcHRpb25zLnNwZWVkK1wibXMgXCIrYi5vcHRpb25zLmNzc0Vhc2UsYi5vcHRpb25zLmZhZGU9PT0hMT9iLiRzbGlkZVRyYWNrLmNzcyhjKTpiLiRzbGlkZXMuZXEoYSkuY3NzKGMpfSxiLnByb3RvdHlwZS5hdXRvUGxheT1mdW5jdGlvbigpe3ZhciBhPXRoaXM7YS5hdXRvUGxheVRpbWVyJiZjbGVhckludGVydmFsKGEuYXV0b1BsYXlUaW1lciksYS5zbGlkZUNvdW50PmEub3B0aW9ucy5zbGlkZXNUb1Nob3cmJmEucGF1c2VkIT09ITAmJihhLmF1dG9QbGF5VGltZXI9c2V0SW50ZXJ2YWwoYS5hdXRvUGxheUl0ZXJhdG9yLGEub3B0aW9ucy5hdXRvcGxheVNwZWVkKSl9LGIucHJvdG90eXBlLmF1dG9QbGF5Q2xlYXI9ZnVuY3Rpb24oKXt2YXIgYT10aGlzO2EuYXV0b1BsYXlUaW1lciYmY2xlYXJJbnRlcnZhbChhLmF1dG9QbGF5VGltZXIpfSxiLnByb3RvdHlwZS5hdXRvUGxheUl0ZXJhdG9yPWZ1bmN0aW9uKCl7dmFyIGE9dGhpczthLm9wdGlvbnMuaW5maW5pdGU9PT0hMT8xPT09YS5kaXJlY3Rpb24/KGEuY3VycmVudFNsaWRlKzE9PT1hLnNsaWRlQ291bnQtMSYmKGEuZGlyZWN0aW9uPTApLGEuc2xpZGVIYW5kbGVyKGEuY3VycmVudFNsaWRlK2Eub3B0aW9ucy5zbGlkZXNUb1Njcm9sbCkpOihhLmN1cnJlbnRTbGlkZS0xPT09MCYmKGEuZGlyZWN0aW9uPTEpLGEuc2xpZGVIYW5kbGVyKGEuY3VycmVudFNsaWRlLWEub3B0aW9ucy5zbGlkZXNUb1Njcm9sbCkpOmEuc2xpZGVIYW5kbGVyKGEuY3VycmVudFNsaWRlK2Eub3B0aW9ucy5zbGlkZXNUb1Njcm9sbCl9LGIucHJvdG90eXBlLmJ1aWxkQXJyb3dzPWZ1bmN0aW9uKCl7dmFyIGI9dGhpcztiLm9wdGlvbnMuYXJyb3dzPT09ITAmJihiLiRwcmV2QXJyb3c9YShiLm9wdGlvbnMucHJldkFycm93KS5hZGRDbGFzcyhcInNsaWNrLWFycm93XCIpLGIuJG5leHRBcnJvdz1hKGIub3B0aW9ucy5uZXh0QXJyb3cpLmFkZENsYXNzKFwic2xpY2stYXJyb3dcIiksYi5zbGlkZUNvdW50PmIub3B0aW9ucy5zbGlkZXNUb1Nob3c/KGIuJHByZXZBcnJvdy5yZW1vdmVDbGFzcyhcInNsaWNrLWhpZGRlblwiKS5yZW1vdmVBdHRyKFwiYXJpYS1oaWRkZW4gdGFiaW5kZXhcIiksYi4kbmV4dEFycm93LnJlbW92ZUNsYXNzKFwic2xpY2staGlkZGVuXCIpLnJlbW92ZUF0dHIoXCJhcmlhLWhpZGRlbiB0YWJpbmRleFwiKSxiLmh0bWxFeHByLnRlc3QoYi5vcHRpb25zLnByZXZBcnJvdykmJmIuJHByZXZBcnJvdy5wcmVwZW5kVG8oYi5vcHRpb25zLmFwcGVuZEFycm93cyksYi5odG1sRXhwci50ZXN0KGIub3B0aW9ucy5uZXh0QXJyb3cpJiZiLiRuZXh0QXJyb3cuYXBwZW5kVG8oYi5vcHRpb25zLmFwcGVuZEFycm93cyksYi5vcHRpb25zLmluZmluaXRlIT09ITAmJmIuJHByZXZBcnJvdy5hZGRDbGFzcyhcInNsaWNrLWRpc2FibGVkXCIpLmF0dHIoXCJhcmlhLWRpc2FibGVkXCIsXCJ0cnVlXCIpKTpiLiRwcmV2QXJyb3cuYWRkKGIuJG5leHRBcnJvdykuYWRkQ2xhc3MoXCJzbGljay1oaWRkZW5cIikuYXR0cih7XCJhcmlhLWRpc2FibGVkXCI6XCJ0cnVlXCIsdGFiaW5kZXg6XCItMVwifSkpfSxiLnByb3RvdHlwZS5idWlsZERvdHM9ZnVuY3Rpb24oKXt2YXIgYyxkLGI9dGhpcztpZihiLm9wdGlvbnMuZG90cz09PSEwJiZiLnNsaWRlQ291bnQ+Yi5vcHRpb25zLnNsaWRlc1RvU2hvdyl7Zm9yKGQ9Jzx1bCBjbGFzcz1cIicrYi5vcHRpb25zLmRvdHNDbGFzcysnXCI+JyxjPTA7Yzw9Yi5nZXREb3RDb3VudCgpO2MrPTEpZCs9XCI8bGk+XCIrYi5vcHRpb25zLmN1c3RvbVBhZ2luZy5jYWxsKHRoaXMsYixjKStcIjwvbGk+XCI7ZCs9XCI8L3VsPlwiLGIuJGRvdHM9YShkKS5hcHBlbmRUbyhiLm9wdGlvbnMuYXBwZW5kRG90cyksYi4kZG90cy5maW5kKFwibGlcIikuZmlyc3QoKS5hZGRDbGFzcyhcInNsaWNrLWFjdGl2ZVwiKS5hdHRyKFwiYXJpYS1oaWRkZW5cIixcImZhbHNlXCIpfX0sYi5wcm90b3R5cGUuYnVpbGRPdXQ9ZnVuY3Rpb24oKXt2YXIgYj10aGlzO2IuJHNsaWRlcz1iLiRzbGlkZXIuY2hpbGRyZW4oYi5vcHRpb25zLnNsaWRlK1wiOm5vdCguc2xpY2stY2xvbmVkKVwiKS5hZGRDbGFzcyhcInNsaWNrLXNsaWRlXCIpLGIuc2xpZGVDb3VudD1iLiRzbGlkZXMubGVuZ3RoLGIuJHNsaWRlcy5lYWNoKGZ1bmN0aW9uKGIsYyl7YShjKS5hdHRyKFwiZGF0YS1zbGljay1pbmRleFwiLGIpLmRhdGEoXCJvcmlnaW5hbFN0eWxpbmdcIixhKGMpLmF0dHIoXCJzdHlsZVwiKXx8XCJcIil9KSxiLiRzbGlkZXIuYWRkQ2xhc3MoXCJzbGljay1zbGlkZXJcIiksYi4kc2xpZGVUcmFjaz0wPT09Yi5zbGlkZUNvdW50P2EoJzxkaXYgY2xhc3M9XCJzbGljay10cmFja1wiLz4nKS5hcHBlbmRUbyhiLiRzbGlkZXIpOmIuJHNsaWRlcy53cmFwQWxsKCc8ZGl2IGNsYXNzPVwic2xpY2stdHJhY2tcIi8+JykucGFyZW50KCksYi4kbGlzdD1iLiRzbGlkZVRyYWNrLndyYXAoJzxkaXYgYXJpYS1saXZlPVwicG9saXRlXCIgY2xhc3M9XCJzbGljay1saXN0XCIvPicpLnBhcmVudCgpLGIuJHNsaWRlVHJhY2suY3NzKFwib3BhY2l0eVwiLDApLChiLm9wdGlvbnMuY2VudGVyTW9kZT09PSEwfHxiLm9wdGlvbnMuc3dpcGVUb1NsaWRlPT09ITApJiYoYi5vcHRpb25zLnNsaWRlc1RvU2Nyb2xsPTEpLGEoXCJpbWdbZGF0YS1sYXp5XVwiLGIuJHNsaWRlcikubm90KFwiW3NyY11cIikuYWRkQ2xhc3MoXCJzbGljay1sb2FkaW5nXCIpLGIuc2V0dXBJbmZpbml0ZSgpLGIuYnVpbGRBcnJvd3MoKSxiLmJ1aWxkRG90cygpLGIudXBkYXRlRG90cygpLGIuc2V0U2xpZGVDbGFzc2VzKFwibnVtYmVyXCI9PXR5cGVvZiBiLmN1cnJlbnRTbGlkZT9iLmN1cnJlbnRTbGlkZTowKSxiLm9wdGlvbnMuZHJhZ2dhYmxlPT09ITAmJmIuJGxpc3QuYWRkQ2xhc3MoXCJkcmFnZ2FibGVcIil9LGIucHJvdG90eXBlLmJ1aWxkUm93cz1mdW5jdGlvbigpe3ZhciBiLGMsZCxlLGYsZyxoLGE9dGhpcztpZihlPWRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKSxnPWEuJHNsaWRlci5jaGlsZHJlbigpLGEub3B0aW9ucy5yb3dzPjEpe2ZvcihoPWEub3B0aW9ucy5zbGlkZXNQZXJSb3cqYS5vcHRpb25zLnJvd3MsZj1NYXRoLmNlaWwoZy5sZW5ndGgvaCksYj0wO2Y+YjtiKyspe3ZhciBpPWRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7Zm9yKGM9MDtjPGEub3B0aW9ucy5yb3dzO2MrKyl7dmFyIGo9ZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtmb3IoZD0wO2Q8YS5vcHRpb25zLnNsaWRlc1BlclJvdztkKyspe3ZhciBrPWIqaCsoYyphLm9wdGlvbnMuc2xpZGVzUGVyUm93K2QpO2cuZ2V0KGspJiZqLmFwcGVuZENoaWxkKGcuZ2V0KGspKX1pLmFwcGVuZENoaWxkKGopfWUuYXBwZW5kQ2hpbGQoaSl9YS4kc2xpZGVyLmh0bWwoZSksYS4kc2xpZGVyLmNoaWxkcmVuKCkuY2hpbGRyZW4oKS5jaGlsZHJlbigpLmNzcyh7d2lkdGg6MTAwL2Eub3B0aW9ucy5zbGlkZXNQZXJSb3crXCIlXCIsZGlzcGxheTpcImlubGluZS1ibG9ja1wifSl9fSxiLnByb3RvdHlwZS5jaGVja1Jlc3BvbnNpdmU9ZnVuY3Rpb24oYixjKXt2YXIgZSxmLGcsZD10aGlzLGg9ITEsaT1kLiRzbGlkZXIud2lkdGgoKSxqPXdpbmRvdy5pbm5lcldpZHRofHxhKHdpbmRvdykud2lkdGgoKTtpZihcIndpbmRvd1wiPT09ZC5yZXNwb25kVG8/Zz1qOlwic2xpZGVyXCI9PT1kLnJlc3BvbmRUbz9nPWk6XCJtaW5cIj09PWQucmVzcG9uZFRvJiYoZz1NYXRoLm1pbihqLGkpKSxkLm9wdGlvbnMucmVzcG9uc2l2ZSYmZC5vcHRpb25zLnJlc3BvbnNpdmUubGVuZ3RoJiZudWxsIT09ZC5vcHRpb25zLnJlc3BvbnNpdmUpe2Y9bnVsbDtmb3IoZSBpbiBkLmJyZWFrcG9pbnRzKWQuYnJlYWtwb2ludHMuaGFzT3duUHJvcGVydHkoZSkmJihkLm9yaWdpbmFsU2V0dGluZ3MubW9iaWxlRmlyc3Q9PT0hMT9nPGQuYnJlYWtwb2ludHNbZV0mJihmPWQuYnJlYWtwb2ludHNbZV0pOmc+ZC5icmVha3BvaW50c1tlXSYmKGY9ZC5icmVha3BvaW50c1tlXSkpO251bGwhPT1mP251bGwhPT1kLmFjdGl2ZUJyZWFrcG9pbnQ/KGYhPT1kLmFjdGl2ZUJyZWFrcG9pbnR8fGMpJiYoZC5hY3RpdmVCcmVha3BvaW50PWYsXCJ1bnNsaWNrXCI9PT1kLmJyZWFrcG9pbnRTZXR0aW5nc1tmXT9kLnVuc2xpY2soZik6KGQub3B0aW9ucz1hLmV4dGVuZCh7fSxkLm9yaWdpbmFsU2V0dGluZ3MsZC5icmVha3BvaW50U2V0dGluZ3NbZl0pLGI9PT0hMCYmKGQuY3VycmVudFNsaWRlPWQub3B0aW9ucy5pbml0aWFsU2xpZGUpLGQucmVmcmVzaChiKSksaD1mKTooZC5hY3RpdmVCcmVha3BvaW50PWYsXCJ1bnNsaWNrXCI9PT1kLmJyZWFrcG9pbnRTZXR0aW5nc1tmXT9kLnVuc2xpY2soZik6KGQub3B0aW9ucz1hLmV4dGVuZCh7fSxkLm9yaWdpbmFsU2V0dGluZ3MsZC5icmVha3BvaW50U2V0dGluZ3NbZl0pLGI9PT0hMCYmKGQuY3VycmVudFNsaWRlPWQub3B0aW9ucy5pbml0aWFsU2xpZGUpLGQucmVmcmVzaChiKSksaD1mKTpudWxsIT09ZC5hY3RpdmVCcmVha3BvaW50JiYoZC5hY3RpdmVCcmVha3BvaW50PW51bGwsZC5vcHRpb25zPWQub3JpZ2luYWxTZXR0aW5ncyxiPT09ITAmJihkLmN1cnJlbnRTbGlkZT1kLm9wdGlvbnMuaW5pdGlhbFNsaWRlKSxkLnJlZnJlc2goYiksaD1mKSxifHxoPT09ITF8fGQuJHNsaWRlci50cmlnZ2VyKFwiYnJlYWtwb2ludFwiLFtkLGhdKX19LGIucHJvdG90eXBlLmNoYW5nZVNsaWRlPWZ1bmN0aW9uKGIsYyl7dmFyIGYsZyxoLGQ9dGhpcyxlPWEoYi50YXJnZXQpO3N3aXRjaChlLmlzKFwiYVwiKSYmYi5wcmV2ZW50RGVmYXVsdCgpLGUuaXMoXCJsaVwiKXx8KGU9ZS5jbG9zZXN0KFwibGlcIikpLGg9ZC5zbGlkZUNvdW50JWQub3B0aW9ucy5zbGlkZXNUb1Njcm9sbCE9PTAsZj1oPzA6KGQuc2xpZGVDb3VudC1kLmN1cnJlbnRTbGlkZSklZC5vcHRpb25zLnNsaWRlc1RvU2Nyb2xsLGIuZGF0YS5tZXNzYWdlKXtjYXNlXCJwcmV2aW91c1wiOmc9MD09PWY/ZC5vcHRpb25zLnNsaWRlc1RvU2Nyb2xsOmQub3B0aW9ucy5zbGlkZXNUb1Nob3ctZixkLnNsaWRlQ291bnQ+ZC5vcHRpb25zLnNsaWRlc1RvU2hvdyYmZC5zbGlkZUhhbmRsZXIoZC5jdXJyZW50U2xpZGUtZywhMSxjKTticmVhaztjYXNlXCJuZXh0XCI6Zz0wPT09Zj9kLm9wdGlvbnMuc2xpZGVzVG9TY3JvbGw6ZixkLnNsaWRlQ291bnQ+ZC5vcHRpb25zLnNsaWRlc1RvU2hvdyYmZC5zbGlkZUhhbmRsZXIoZC5jdXJyZW50U2xpZGUrZywhMSxjKTticmVhaztjYXNlXCJpbmRleFwiOnZhciBpPTA9PT1iLmRhdGEuaW5kZXg/MDpiLmRhdGEuaW5kZXh8fGUuaW5kZXgoKSpkLm9wdGlvbnMuc2xpZGVzVG9TY3JvbGw7ZC5zbGlkZUhhbmRsZXIoZC5jaGVja05hdmlnYWJsZShpKSwhMSxjKSxlLmNoaWxkcmVuKCkudHJpZ2dlcihcImZvY3VzXCIpO2JyZWFrO2RlZmF1bHQ6cmV0dXJufX0sYi5wcm90b3R5cGUuY2hlY2tOYXZpZ2FibGU9ZnVuY3Rpb24oYSl7dmFyIGMsZCxiPXRoaXM7aWYoYz1iLmdldE5hdmlnYWJsZUluZGV4ZXMoKSxkPTAsYT5jW2MubGVuZ3RoLTFdKWE9Y1tjLmxlbmd0aC0xXTtlbHNlIGZvcih2YXIgZSBpbiBjKXtpZihhPGNbZV0pe2E9ZDticmVha31kPWNbZV19cmV0dXJuIGF9LGIucHJvdG90eXBlLmNsZWFuVXBFdmVudHM9ZnVuY3Rpb24oKXt2YXIgYj10aGlzO2Iub3B0aW9ucy5kb3RzJiZudWxsIT09Yi4kZG90cyYmKGEoXCJsaVwiLGIuJGRvdHMpLm9mZihcImNsaWNrLnNsaWNrXCIsYi5jaGFuZ2VTbGlkZSksYi5vcHRpb25zLnBhdXNlT25Eb3RzSG92ZXI9PT0hMCYmYi5vcHRpb25zLmF1dG9wbGF5PT09ITAmJmEoXCJsaVwiLGIuJGRvdHMpLm9mZihcIm1vdXNlZW50ZXIuc2xpY2tcIixhLnByb3h5KGIuc2V0UGF1c2VkLGIsITApKS5vZmYoXCJtb3VzZWxlYXZlLnNsaWNrXCIsYS5wcm94eShiLnNldFBhdXNlZCxiLCExKSkpLGIub3B0aW9ucy5hcnJvd3M9PT0hMCYmYi5zbGlkZUNvdW50PmIub3B0aW9ucy5zbGlkZXNUb1Nob3cmJihiLiRwcmV2QXJyb3cmJmIuJHByZXZBcnJvdy5vZmYoXCJjbGljay5zbGlja1wiLGIuY2hhbmdlU2xpZGUpLGIuJG5leHRBcnJvdyYmYi4kbmV4dEFycm93Lm9mZihcImNsaWNrLnNsaWNrXCIsYi5jaGFuZ2VTbGlkZSkpLGIuJGxpc3Qub2ZmKFwidG91Y2hzdGFydC5zbGljayBtb3VzZWRvd24uc2xpY2tcIixiLnN3aXBlSGFuZGxlciksYi4kbGlzdC5vZmYoXCJ0b3VjaG1vdmUuc2xpY2sgbW91c2Vtb3ZlLnNsaWNrXCIsYi5zd2lwZUhhbmRsZXIpLGIuJGxpc3Qub2ZmKFwidG91Y2hlbmQuc2xpY2sgbW91c2V1cC5zbGlja1wiLGIuc3dpcGVIYW5kbGVyKSxiLiRsaXN0Lm9mZihcInRvdWNoY2FuY2VsLnNsaWNrIG1vdXNlbGVhdmUuc2xpY2tcIixiLnN3aXBlSGFuZGxlciksYi4kbGlzdC5vZmYoXCJjbGljay5zbGlja1wiLGIuY2xpY2tIYW5kbGVyKSxhKGRvY3VtZW50KS5vZmYoYi52aXNpYmlsaXR5Q2hhbmdlLGIudmlzaWJpbGl0eSksYi4kbGlzdC5vZmYoXCJtb3VzZWVudGVyLnNsaWNrXCIsYS5wcm94eShiLnNldFBhdXNlZCxiLCEwKSksYi4kbGlzdC5vZmYoXCJtb3VzZWxlYXZlLnNsaWNrXCIsYS5wcm94eShiLnNldFBhdXNlZCxiLCExKSksYi5vcHRpb25zLmFjY2Vzc2liaWxpdHk9PT0hMCYmYi4kbGlzdC5vZmYoXCJrZXlkb3duLnNsaWNrXCIsYi5rZXlIYW5kbGVyKSxiLm9wdGlvbnMuZm9jdXNPblNlbGVjdD09PSEwJiZhKGIuJHNsaWRlVHJhY2spLmNoaWxkcmVuKCkub2ZmKFwiY2xpY2suc2xpY2tcIixiLnNlbGVjdEhhbmRsZXIpLGEod2luZG93KS5vZmYoXCJvcmllbnRhdGlvbmNoYW5nZS5zbGljay5zbGljay1cIitiLmluc3RhbmNlVWlkLGIub3JpZW50YXRpb25DaGFuZ2UpLGEod2luZG93KS5vZmYoXCJyZXNpemUuc2xpY2suc2xpY2stXCIrYi5pbnN0YW5jZVVpZCxiLnJlc2l6ZSksYShcIltkcmFnZ2FibGUhPXRydWVdXCIsYi4kc2xpZGVUcmFjaykub2ZmKFwiZHJhZ3N0YXJ0XCIsYi5wcmV2ZW50RGVmYXVsdCksYSh3aW5kb3cpLm9mZihcImxvYWQuc2xpY2suc2xpY2stXCIrYi5pbnN0YW5jZVVpZCxiLnNldFBvc2l0aW9uKSxhKGRvY3VtZW50KS5vZmYoXCJyZWFkeS5zbGljay5zbGljay1cIitiLmluc3RhbmNlVWlkLGIuc2V0UG9zaXRpb24pfSxiLnByb3RvdHlwZS5jbGVhblVwUm93cz1mdW5jdGlvbigpe3ZhciBiLGE9dGhpczthLm9wdGlvbnMucm93cz4xJiYoYj1hLiRzbGlkZXMuY2hpbGRyZW4oKS5jaGlsZHJlbigpLGIucmVtb3ZlQXR0cihcInN0eWxlXCIpLGEuJHNsaWRlci5odG1sKGIpKX0sYi5wcm90b3R5cGUuY2xpY2tIYW5kbGVyPWZ1bmN0aW9uKGEpe3ZhciBiPXRoaXM7Yi5zaG91bGRDbGljaz09PSExJiYoYS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKSxhLnN0b3BQcm9wYWdhdGlvbigpLGEucHJldmVudERlZmF1bHQoKSl9LGIucHJvdG90eXBlLmRlc3Ryb3k9ZnVuY3Rpb24oYil7dmFyIGM9dGhpcztjLmF1dG9QbGF5Q2xlYXIoKSxjLnRvdWNoT2JqZWN0PXt9LGMuY2xlYW5VcEV2ZW50cygpLGEoXCIuc2xpY2stY2xvbmVkXCIsYy4kc2xpZGVyKS5kZXRhY2goKSxjLiRkb3RzJiZjLiRkb3RzLnJlbW92ZSgpLGMuJHByZXZBcnJvdyYmYy4kcHJldkFycm93Lmxlbmd0aCYmKGMuJHByZXZBcnJvdy5yZW1vdmVDbGFzcyhcInNsaWNrLWRpc2FibGVkIHNsaWNrLWFycm93IHNsaWNrLWhpZGRlblwiKS5yZW1vdmVBdHRyKFwiYXJpYS1oaWRkZW4gYXJpYS1kaXNhYmxlZCB0YWJpbmRleFwiKS5jc3MoXCJkaXNwbGF5XCIsXCJcIiksYy5odG1sRXhwci50ZXN0KGMub3B0aW9ucy5wcmV2QXJyb3cpJiZjLiRwcmV2QXJyb3cucmVtb3ZlKCkpLGMuJG5leHRBcnJvdyYmYy4kbmV4dEFycm93Lmxlbmd0aCYmKGMuJG5leHRBcnJvdy5yZW1vdmVDbGFzcyhcInNsaWNrLWRpc2FibGVkIHNsaWNrLWFycm93IHNsaWNrLWhpZGRlblwiKS5yZW1vdmVBdHRyKFwiYXJpYS1oaWRkZW4gYXJpYS1kaXNhYmxlZCB0YWJpbmRleFwiKS5jc3MoXCJkaXNwbGF5XCIsXCJcIiksYy5odG1sRXhwci50ZXN0KGMub3B0aW9ucy5uZXh0QXJyb3cpJiZjLiRuZXh0QXJyb3cucmVtb3ZlKCkpLGMuJHNsaWRlcyYmKGMuJHNsaWRlcy5yZW1vdmVDbGFzcyhcInNsaWNrLXNsaWRlIHNsaWNrLWFjdGl2ZSBzbGljay1jZW50ZXIgc2xpY2stdmlzaWJsZSBzbGljay1jdXJyZW50XCIpLnJlbW92ZUF0dHIoXCJhcmlhLWhpZGRlblwiKS5yZW1vdmVBdHRyKFwiZGF0YS1zbGljay1pbmRleFwiKS5lYWNoKGZ1bmN0aW9uKCl7YSh0aGlzKS5hdHRyKFwic3R5bGVcIixhKHRoaXMpLmRhdGEoXCJvcmlnaW5hbFN0eWxpbmdcIikpfSksYy4kc2xpZGVUcmFjay5jaGlsZHJlbih0aGlzLm9wdGlvbnMuc2xpZGUpLmRldGFjaCgpLGMuJHNsaWRlVHJhY2suZGV0YWNoKCksYy4kbGlzdC5kZXRhY2goKSxjLiRzbGlkZXIuYXBwZW5kKGMuJHNsaWRlcykpLGMuY2xlYW5VcFJvd3MoKSxjLiRzbGlkZXIucmVtb3ZlQ2xhc3MoXCJzbGljay1zbGlkZXJcIiksYy4kc2xpZGVyLnJlbW92ZUNsYXNzKFwic2xpY2staW5pdGlhbGl6ZWRcIiksYy51bnNsaWNrZWQ9ITAsYnx8Yy4kc2xpZGVyLnRyaWdnZXIoXCJkZXN0cm95XCIsW2NdKX0sYi5wcm90b3R5cGUuZGlzYWJsZVRyYW5zaXRpb249ZnVuY3Rpb24oYSl7dmFyIGI9dGhpcyxjPXt9O2NbYi50cmFuc2l0aW9uVHlwZV09XCJcIixiLm9wdGlvbnMuZmFkZT09PSExP2IuJHNsaWRlVHJhY2suY3NzKGMpOmIuJHNsaWRlcy5lcShhKS5jc3MoYyl9LGIucHJvdG90eXBlLmZhZGVTbGlkZT1mdW5jdGlvbihhLGIpe3ZhciBjPXRoaXM7Yy5jc3NUcmFuc2l0aW9ucz09PSExPyhjLiRzbGlkZXMuZXEoYSkuY3NzKHt6SW5kZXg6Yy5vcHRpb25zLnpJbmRleH0pLGMuJHNsaWRlcy5lcShhKS5hbmltYXRlKHtvcGFjaXR5OjF9LGMub3B0aW9ucy5zcGVlZCxjLm9wdGlvbnMuZWFzaW5nLGIpKTooYy5hcHBseVRyYW5zaXRpb24oYSksYy4kc2xpZGVzLmVxKGEpLmNzcyh7b3BhY2l0eToxLHpJbmRleDpjLm9wdGlvbnMuekluZGV4fSksYiYmc2V0VGltZW91dChmdW5jdGlvbigpe2MuZGlzYWJsZVRyYW5zaXRpb24oYSksYi5jYWxsKCl9LGMub3B0aW9ucy5zcGVlZCkpfSxiLnByb3RvdHlwZS5mYWRlU2xpZGVPdXQ9ZnVuY3Rpb24oYSl7dmFyIGI9dGhpcztiLmNzc1RyYW5zaXRpb25zPT09ITE/Yi4kc2xpZGVzLmVxKGEpLmFuaW1hdGUoe29wYWNpdHk6MCx6SW5kZXg6Yi5vcHRpb25zLnpJbmRleC0yfSxiLm9wdGlvbnMuc3BlZWQsYi5vcHRpb25zLmVhc2luZyk6KGIuYXBwbHlUcmFuc2l0aW9uKGEpLGIuJHNsaWRlcy5lcShhKS5jc3Moe29wYWNpdHk6MCx6SW5kZXg6Yi5vcHRpb25zLnpJbmRleC0yfSkpfSxiLnByb3RvdHlwZS5maWx0ZXJTbGlkZXM9Yi5wcm90b3R5cGUuc2xpY2tGaWx0ZXI9ZnVuY3Rpb24oYSl7dmFyIGI9dGhpcztudWxsIT09YSYmKGIuJHNsaWRlc0NhY2hlPWIuJHNsaWRlcyxiLnVubG9hZCgpLGIuJHNsaWRlVHJhY2suY2hpbGRyZW4odGhpcy5vcHRpb25zLnNsaWRlKS5kZXRhY2goKSxiLiRzbGlkZXNDYWNoZS5maWx0ZXIoYSkuYXBwZW5kVG8oYi4kc2xpZGVUcmFjayksYi5yZWluaXQoKSl9LGIucHJvdG90eXBlLmdldEN1cnJlbnQ9Yi5wcm90b3R5cGUuc2xpY2tDdXJyZW50U2xpZGU9ZnVuY3Rpb24oKXt2YXIgYT10aGlzO3JldHVybiBhLmN1cnJlbnRTbGlkZX0sYi5wcm90b3R5cGUuZ2V0RG90Q291bnQ9ZnVuY3Rpb24oKXt2YXIgYT10aGlzLGI9MCxjPTAsZD0wO2lmKGEub3B0aW9ucy5pbmZpbml0ZT09PSEwKWZvcig7YjxhLnNsaWRlQ291bnQ7KSsrZCxiPWMrYS5vcHRpb25zLnNsaWRlc1RvU2Nyb2xsLGMrPWEub3B0aW9ucy5zbGlkZXNUb1Njcm9sbDw9YS5vcHRpb25zLnNsaWRlc1RvU2hvdz9hLm9wdGlvbnMuc2xpZGVzVG9TY3JvbGw6YS5vcHRpb25zLnNsaWRlc1RvU2hvdztlbHNlIGlmKGEub3B0aW9ucy5jZW50ZXJNb2RlPT09ITApZD1hLnNsaWRlQ291bnQ7ZWxzZSBmb3IoO2I8YS5zbGlkZUNvdW50OykrK2QsYj1jK2Eub3B0aW9ucy5zbGlkZXNUb1Njcm9sbCxjKz1hLm9wdGlvbnMuc2xpZGVzVG9TY3JvbGw8PWEub3B0aW9ucy5zbGlkZXNUb1Nob3c/YS5vcHRpb25zLnNsaWRlc1RvU2Nyb2xsOmEub3B0aW9ucy5zbGlkZXNUb1Nob3c7cmV0dXJuIGQtMX0sYi5wcm90b3R5cGUuZ2V0TGVmdD1mdW5jdGlvbihhKXt2YXIgYyxkLGYsYj10aGlzLGU9MDtyZXR1cm4gYi5zbGlkZU9mZnNldD0wLGQ9Yi4kc2xpZGVzLmZpcnN0KCkub3V0ZXJIZWlnaHQoITApLGIub3B0aW9ucy5pbmZpbml0ZT09PSEwPyhiLnNsaWRlQ291bnQ+Yi5vcHRpb25zLnNsaWRlc1RvU2hvdyYmKGIuc2xpZGVPZmZzZXQ9Yi5zbGlkZVdpZHRoKmIub3B0aW9ucy5zbGlkZXNUb1Nob3cqLTEsZT1kKmIub3B0aW9ucy5zbGlkZXNUb1Nob3cqLTEpLGIuc2xpZGVDb3VudCViLm9wdGlvbnMuc2xpZGVzVG9TY3JvbGwhPT0wJiZhK2Iub3B0aW9ucy5zbGlkZXNUb1Njcm9sbD5iLnNsaWRlQ291bnQmJmIuc2xpZGVDb3VudD5iLm9wdGlvbnMuc2xpZGVzVG9TaG93JiYoYT5iLnNsaWRlQ291bnQ/KGIuc2xpZGVPZmZzZXQ9KGIub3B0aW9ucy5zbGlkZXNUb1Nob3ctKGEtYi5zbGlkZUNvdW50KSkqYi5zbGlkZVdpZHRoKi0xLGU9KGIub3B0aW9ucy5zbGlkZXNUb1Nob3ctKGEtYi5zbGlkZUNvdW50KSkqZCotMSk6KGIuc2xpZGVPZmZzZXQ9Yi5zbGlkZUNvdW50JWIub3B0aW9ucy5zbGlkZXNUb1Njcm9sbCpiLnNsaWRlV2lkdGgqLTEsZT1iLnNsaWRlQ291bnQlYi5vcHRpb25zLnNsaWRlc1RvU2Nyb2xsKmQqLTEpKSk6YStiLm9wdGlvbnMuc2xpZGVzVG9TaG93PmIuc2xpZGVDb3VudCYmKGIuc2xpZGVPZmZzZXQ9KGErYi5vcHRpb25zLnNsaWRlc1RvU2hvdy1iLnNsaWRlQ291bnQpKmIuc2xpZGVXaWR0aCxlPShhK2Iub3B0aW9ucy5zbGlkZXNUb1Nob3ctYi5zbGlkZUNvdW50KSpkKSxiLnNsaWRlQ291bnQ8PWIub3B0aW9ucy5zbGlkZXNUb1Nob3cmJihiLnNsaWRlT2Zmc2V0PTAsZT0wKSxiLm9wdGlvbnMuY2VudGVyTW9kZT09PSEwJiZiLm9wdGlvbnMuaW5maW5pdGU9PT0hMD9iLnNsaWRlT2Zmc2V0Kz1iLnNsaWRlV2lkdGgqTWF0aC5mbG9vcihiLm9wdGlvbnMuc2xpZGVzVG9TaG93LzIpLWIuc2xpZGVXaWR0aDpiLm9wdGlvbnMuY2VudGVyTW9kZT09PSEwJiYoYi5zbGlkZU9mZnNldD0wLGIuc2xpZGVPZmZzZXQrPWIuc2xpZGVXaWR0aCpNYXRoLmZsb29yKGIub3B0aW9ucy5zbGlkZXNUb1Nob3cvMikpLGM9Yi5vcHRpb25zLnZlcnRpY2FsPT09ITE/YSpiLnNsaWRlV2lkdGgqLTErYi5zbGlkZU9mZnNldDphKmQqLTErZSxiLm9wdGlvbnMudmFyaWFibGVXaWR0aD09PSEwJiYoZj1iLnNsaWRlQ291bnQ8PWIub3B0aW9ucy5zbGlkZXNUb1Nob3d8fGIub3B0aW9ucy5pbmZpbml0ZT09PSExP2IuJHNsaWRlVHJhY2suY2hpbGRyZW4oXCIuc2xpY2stc2xpZGVcIikuZXEoYSk6Yi4kc2xpZGVUcmFjay5jaGlsZHJlbihcIi5zbGljay1zbGlkZVwiKS5lcShhK2Iub3B0aW9ucy5zbGlkZXNUb1Nob3cpLGM9Yi5vcHRpb25zLnJ0bD09PSEwP2ZbMF0/LTEqKGIuJHNsaWRlVHJhY2sud2lkdGgoKS1mWzBdLm9mZnNldExlZnQtZi53aWR0aCgpKTowOmZbMF0/LTEqZlswXS5vZmZzZXRMZWZ0OjAsYi5vcHRpb25zLmNlbnRlck1vZGU9PT0hMCYmKGY9Yi5zbGlkZUNvdW50PD1iLm9wdGlvbnMuc2xpZGVzVG9TaG93fHxiLm9wdGlvbnMuaW5maW5pdGU9PT0hMT9iLiRzbGlkZVRyYWNrLmNoaWxkcmVuKFwiLnNsaWNrLXNsaWRlXCIpLmVxKGEpOmIuJHNsaWRlVHJhY2suY2hpbGRyZW4oXCIuc2xpY2stc2xpZGVcIikuZXEoYStiLm9wdGlvbnMuc2xpZGVzVG9TaG93KzEpLGM9Yi5vcHRpb25zLnJ0bD09PSEwP2ZbMF0/LTEqKGIuJHNsaWRlVHJhY2sud2lkdGgoKS1mWzBdLm9mZnNldExlZnQtZi53aWR0aCgpKTowOmZbMF0/LTEqZlswXS5vZmZzZXRMZWZ0OjAsYys9KGIuJGxpc3Qud2lkdGgoKS1mLm91dGVyV2lkdGgoKSkvMikpLGN9LGIucHJvdG90eXBlLmdldE9wdGlvbj1iLnByb3RvdHlwZS5zbGlja0dldE9wdGlvbj1mdW5jdGlvbihhKXt2YXIgYj10aGlzO3JldHVybiBiLm9wdGlvbnNbYV19LGIucHJvdG90eXBlLmdldE5hdmlnYWJsZUluZGV4ZXM9ZnVuY3Rpb24oKXt2YXIgZSxhPXRoaXMsYj0wLGM9MCxkPVtdO2ZvcihhLm9wdGlvbnMuaW5maW5pdGU9PT0hMT9lPWEuc2xpZGVDb3VudDooYj0tMSphLm9wdGlvbnMuc2xpZGVzVG9TY3JvbGwsYz0tMSphLm9wdGlvbnMuc2xpZGVzVG9TY3JvbGwsZT0yKmEuc2xpZGVDb3VudCk7ZT5iOylkLnB1c2goYiksYj1jK2Eub3B0aW9ucy5zbGlkZXNUb1Njcm9sbCxjKz1hLm9wdGlvbnMuc2xpZGVzVG9TY3JvbGw8PWEub3B0aW9ucy5zbGlkZXNUb1Nob3c/YS5vcHRpb25zLnNsaWRlc1RvU2Nyb2xsOmEub3B0aW9ucy5zbGlkZXNUb1Nob3c7cmV0dXJuIGR9LGIucHJvdG90eXBlLmdldFNsaWNrPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXN9LGIucHJvdG90eXBlLmdldFNsaWRlQ291bnQ9ZnVuY3Rpb24oKXt2YXIgYyxkLGUsYj10aGlzO3JldHVybiBlPWIub3B0aW9ucy5jZW50ZXJNb2RlPT09ITA/Yi5zbGlkZVdpZHRoKk1hdGguZmxvb3IoYi5vcHRpb25zLnNsaWRlc1RvU2hvdy8yKTowLGIub3B0aW9ucy5zd2lwZVRvU2xpZGU9PT0hMD8oYi4kc2xpZGVUcmFjay5maW5kKFwiLnNsaWNrLXNsaWRlXCIpLmVhY2goZnVuY3Rpb24oYyxmKXtyZXR1cm4gZi5vZmZzZXRMZWZ0LWUrYShmKS5vdXRlcldpZHRoKCkvMj4tMSpiLnN3aXBlTGVmdD8oZD1mLCExKTp2b2lkIDB9KSxjPU1hdGguYWJzKGEoZCkuYXR0cihcImRhdGEtc2xpY2staW5kZXhcIiktYi5jdXJyZW50U2xpZGUpfHwxKTpiLm9wdGlvbnMuc2xpZGVzVG9TY3JvbGx9LGIucHJvdG90eXBlLmdvVG89Yi5wcm90b3R5cGUuc2xpY2tHb1RvPWZ1bmN0aW9uKGEsYil7dmFyIGM9dGhpcztjLmNoYW5nZVNsaWRlKHtkYXRhOnttZXNzYWdlOlwiaW5kZXhcIixpbmRleDpwYXJzZUludChhKX19LGIpfSxiLnByb3RvdHlwZS5pbml0PWZ1bmN0aW9uKGIpe3ZhciBjPXRoaXM7YShjLiRzbGlkZXIpLmhhc0NsYXNzKFwic2xpY2staW5pdGlhbGl6ZWRcIil8fChhKGMuJHNsaWRlcikuYWRkQ2xhc3MoXCJzbGljay1pbml0aWFsaXplZFwiKSxjLmJ1aWxkUm93cygpLGMuYnVpbGRPdXQoKSxjLnNldFByb3BzKCksYy5zdGFydExvYWQoKSxjLmxvYWRTbGlkZXIoKSxjLmluaXRpYWxpemVFdmVudHMoKSxjLnVwZGF0ZUFycm93cygpLGMudXBkYXRlRG90cygpKSxiJiZjLiRzbGlkZXIudHJpZ2dlcihcImluaXRcIixbY10pLGMub3B0aW9ucy5hY2Nlc3NpYmlsaXR5PT09ITAmJmMuaW5pdEFEQSgpfSxiLnByb3RvdHlwZS5pbml0QXJyb3dFdmVudHM9ZnVuY3Rpb24oKXt2YXIgYT10aGlzO2Eub3B0aW9ucy5hcnJvd3M9PT0hMCYmYS5zbGlkZUNvdW50PmEub3B0aW9ucy5zbGlkZXNUb1Nob3cmJihhLiRwcmV2QXJyb3cub24oXCJjbGljay5zbGlja1wiLHttZXNzYWdlOlwicHJldmlvdXNcIn0sYS5jaGFuZ2VTbGlkZSksYS4kbmV4dEFycm93Lm9uKFwiY2xpY2suc2xpY2tcIix7bWVzc2FnZTpcIm5leHRcIn0sYS5jaGFuZ2VTbGlkZSkpfSxiLnByb3RvdHlwZS5pbml0RG90RXZlbnRzPWZ1bmN0aW9uKCl7dmFyIGI9dGhpcztiLm9wdGlvbnMuZG90cz09PSEwJiZiLnNsaWRlQ291bnQ+Yi5vcHRpb25zLnNsaWRlc1RvU2hvdyYmYShcImxpXCIsYi4kZG90cykub24oXCJjbGljay5zbGlja1wiLHttZXNzYWdlOlwiaW5kZXhcIn0sYi5jaGFuZ2VTbGlkZSksYi5vcHRpb25zLmRvdHM9PT0hMCYmYi5vcHRpb25zLnBhdXNlT25Eb3RzSG92ZXI9PT0hMCYmYi5vcHRpb25zLmF1dG9wbGF5PT09ITAmJmEoXCJsaVwiLGIuJGRvdHMpLm9uKFwibW91c2VlbnRlci5zbGlja1wiLGEucHJveHkoYi5zZXRQYXVzZWQsYiwhMCkpLm9uKFwibW91c2VsZWF2ZS5zbGlja1wiLGEucHJveHkoYi5zZXRQYXVzZWQsYiwhMSkpfSxiLnByb3RvdHlwZS5pbml0aWFsaXplRXZlbnRzPWZ1bmN0aW9uKCl7dmFyIGI9dGhpcztiLmluaXRBcnJvd0V2ZW50cygpLGIuaW5pdERvdEV2ZW50cygpLGIuJGxpc3Qub24oXCJ0b3VjaHN0YXJ0LnNsaWNrIG1vdXNlZG93bi5zbGlja1wiLHthY3Rpb246XCJzdGFydFwifSxiLnN3aXBlSGFuZGxlciksYi4kbGlzdC5vbihcInRvdWNobW92ZS5zbGljayBtb3VzZW1vdmUuc2xpY2tcIix7YWN0aW9uOlwibW92ZVwifSxiLnN3aXBlSGFuZGxlciksYi4kbGlzdC5vbihcInRvdWNoZW5kLnNsaWNrIG1vdXNldXAuc2xpY2tcIix7YWN0aW9uOlwiZW5kXCJ9LGIuc3dpcGVIYW5kbGVyKSxiLiRsaXN0Lm9uKFwidG91Y2hjYW5jZWwuc2xpY2sgbW91c2VsZWF2ZS5zbGlja1wiLHthY3Rpb246XCJlbmRcIn0sYi5zd2lwZUhhbmRsZXIpLGIuJGxpc3Qub24oXCJjbGljay5zbGlja1wiLGIuY2xpY2tIYW5kbGVyKSxhKGRvY3VtZW50KS5vbihiLnZpc2liaWxpdHlDaGFuZ2UsYS5wcm94eShiLnZpc2liaWxpdHksYikpLGIuJGxpc3Qub24oXCJtb3VzZWVudGVyLnNsaWNrXCIsYS5wcm94eShiLnNldFBhdXNlZCxiLCEwKSksYi4kbGlzdC5vbihcIm1vdXNlbGVhdmUuc2xpY2tcIixhLnByb3h5KGIuc2V0UGF1c2VkLGIsITEpKSxiLm9wdGlvbnMuYWNjZXNzaWJpbGl0eT09PSEwJiZiLiRsaXN0Lm9uKFwia2V5ZG93bi5zbGlja1wiLGIua2V5SGFuZGxlciksYi5vcHRpb25zLmZvY3VzT25TZWxlY3Q9PT0hMCYmYShiLiRzbGlkZVRyYWNrKS5jaGlsZHJlbigpLm9uKFwiY2xpY2suc2xpY2tcIixiLnNlbGVjdEhhbmRsZXIpLGEod2luZG93KS5vbihcIm9yaWVudGF0aW9uY2hhbmdlLnNsaWNrLnNsaWNrLVwiK2IuaW5zdGFuY2VVaWQsYS5wcm94eShiLm9yaWVudGF0aW9uQ2hhbmdlLGIpKSxhKHdpbmRvdykub24oXCJyZXNpemUuc2xpY2suc2xpY2stXCIrYi5pbnN0YW5jZVVpZCxhLnByb3h5KGIucmVzaXplLGIpKSxhKFwiW2RyYWdnYWJsZSE9dHJ1ZV1cIixiLiRzbGlkZVRyYWNrKS5vbihcImRyYWdzdGFydFwiLGIucHJldmVudERlZmF1bHQpLGEod2luZG93KS5vbihcImxvYWQuc2xpY2suc2xpY2stXCIrYi5pbnN0YW5jZVVpZCxiLnNldFBvc2l0aW9uKSxhKGRvY3VtZW50KS5vbihcInJlYWR5LnNsaWNrLnNsaWNrLVwiK2IuaW5zdGFuY2VVaWQsYi5zZXRQb3NpdGlvbil9LGIucHJvdG90eXBlLmluaXRVST1mdW5jdGlvbigpe3ZhciBhPXRoaXM7YS5vcHRpb25zLmFycm93cz09PSEwJiZhLnNsaWRlQ291bnQ+YS5vcHRpb25zLnNsaWRlc1RvU2hvdyYmKGEuJHByZXZBcnJvdy5zaG93KCksYS4kbmV4dEFycm93LnNob3coKSksYS5vcHRpb25zLmRvdHM9PT0hMCYmYS5zbGlkZUNvdW50PmEub3B0aW9ucy5zbGlkZXNUb1Nob3cmJmEuJGRvdHMuc2hvdygpLGEub3B0aW9ucy5hdXRvcGxheT09PSEwJiZhLmF1dG9QbGF5KCl9LGIucHJvdG90eXBlLmtleUhhbmRsZXI9ZnVuY3Rpb24oYSl7dmFyIGI9dGhpczthLnRhcmdldC50YWdOYW1lLm1hdGNoKFwiVEVYVEFSRUF8SU5QVVR8U0VMRUNUXCIpfHwoMzc9PT1hLmtleUNvZGUmJmIub3B0aW9ucy5hY2Nlc3NpYmlsaXR5PT09ITA/Yi5jaGFuZ2VTbGlkZSh7ZGF0YTp7bWVzc2FnZTpcInByZXZpb3VzXCJ9fSk6Mzk9PT1hLmtleUNvZGUmJmIub3B0aW9ucy5hY2Nlc3NpYmlsaXR5PT09ITAmJmIuY2hhbmdlU2xpZGUoe2RhdGE6e21lc3NhZ2U6XCJuZXh0XCJ9fSkpfSxiLnByb3RvdHlwZS5sYXp5TG9hZD1mdW5jdGlvbigpe2Z1bmN0aW9uIGcoYil7YShcImltZ1tkYXRhLWxhenldXCIsYikuZWFjaChmdW5jdGlvbigpe3ZhciBiPWEodGhpcyksYz1hKHRoaXMpLmF0dHIoXCJkYXRhLWxhenlcIiksZD1kb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiaW1nXCIpO2Qub25sb2FkPWZ1bmN0aW9uKCl7Yi5hbmltYXRlKHtvcGFjaXR5OjB9LDEwMCxmdW5jdGlvbigpe2IuYXR0cihcInNyY1wiLGMpLmFuaW1hdGUoe29wYWNpdHk6MX0sMjAwLGZ1bmN0aW9uKCl7Yi5yZW1vdmVBdHRyKFwiZGF0YS1sYXp5XCIpLnJlbW92ZUNsYXNzKFwic2xpY2stbG9hZGluZ1wiKX0pfSl9LGQuc3JjPWN9KX12YXIgYyxkLGUsZixiPXRoaXM7Yi5vcHRpb25zLmNlbnRlck1vZGU9PT0hMD9iLm9wdGlvbnMuaW5maW5pdGU9PT0hMD8oZT1iLmN1cnJlbnRTbGlkZSsoYi5vcHRpb25zLnNsaWRlc1RvU2hvdy8yKzEpLGY9ZStiLm9wdGlvbnMuc2xpZGVzVG9TaG93KzIpOihlPU1hdGgubWF4KDAsYi5jdXJyZW50U2xpZGUtKGIub3B0aW9ucy5zbGlkZXNUb1Nob3cvMisxKSksZj0yKyhiLm9wdGlvbnMuc2xpZGVzVG9TaG93LzIrMSkrYi5jdXJyZW50U2xpZGUpOihlPWIub3B0aW9ucy5pbmZpbml0ZT9iLm9wdGlvbnMuc2xpZGVzVG9TaG93K2IuY3VycmVudFNsaWRlOmIuY3VycmVudFNsaWRlLGY9ZStiLm9wdGlvbnMuc2xpZGVzVG9TaG93LGIub3B0aW9ucy5mYWRlPT09ITAmJihlPjAmJmUtLSxmPD1iLnNsaWRlQ291bnQmJmYrKykpLGM9Yi4kc2xpZGVyLmZpbmQoXCIuc2xpY2stc2xpZGVcIikuc2xpY2UoZSxmKSxnKGMpLGIuc2xpZGVDb3VudDw9Yi5vcHRpb25zLnNsaWRlc1RvU2hvdz8oZD1iLiRzbGlkZXIuZmluZChcIi5zbGljay1zbGlkZVwiKSxnKGQpKTpiLmN1cnJlbnRTbGlkZT49Yi5zbGlkZUNvdW50LWIub3B0aW9ucy5zbGlkZXNUb1Nob3c/KGQ9Yi4kc2xpZGVyLmZpbmQoXCIuc2xpY2stY2xvbmVkXCIpLnNsaWNlKDAsYi5vcHRpb25zLnNsaWRlc1RvU2hvdyksZyhkKSk6MD09PWIuY3VycmVudFNsaWRlJiYoZD1iLiRzbGlkZXIuZmluZChcIi5zbGljay1jbG9uZWRcIikuc2xpY2UoLTEqYi5vcHRpb25zLnNsaWRlc1RvU2hvdyksZyhkKSl9LGIucHJvdG90eXBlLmxvYWRTbGlkZXI9ZnVuY3Rpb24oKXt2YXIgYT10aGlzO2Euc2V0UG9zaXRpb24oKSxhLiRzbGlkZVRyYWNrLmNzcyh7b3BhY2l0eToxfSksYS4kc2xpZGVyLnJlbW92ZUNsYXNzKFwic2xpY2stbG9hZGluZ1wiKSxhLmluaXRVSSgpLFwicHJvZ3Jlc3NpdmVcIj09PWEub3B0aW9ucy5sYXp5TG9hZCYmYS5wcm9ncmVzc2l2ZUxhenlMb2FkKCl9LGIucHJvdG90eXBlLm5leHQ9Yi5wcm90b3R5cGUuc2xpY2tOZXh0PWZ1bmN0aW9uKCl7dmFyIGE9dGhpczthLmNoYW5nZVNsaWRlKHtkYXRhOnttZXNzYWdlOlwibmV4dFwifX0pfSxiLnByb3RvdHlwZS5vcmllbnRhdGlvbkNoYW5nZT1mdW5jdGlvbigpe3ZhciBhPXRoaXM7YS5jaGVja1Jlc3BvbnNpdmUoKSxhLnNldFBvc2l0aW9uKCl9LGIucHJvdG90eXBlLnBhdXNlPWIucHJvdG90eXBlLnNsaWNrUGF1c2U9ZnVuY3Rpb24oKXt2YXIgYT10aGlzO2EuYXV0b1BsYXlDbGVhcigpLGEucGF1c2VkPSEwfSxiLnByb3RvdHlwZS5wbGF5PWIucHJvdG90eXBlLnNsaWNrUGxheT1mdW5jdGlvbigpe3ZhciBhPXRoaXM7YS5wYXVzZWQ9ITEsYS5hdXRvUGxheSgpfSxiLnByb3RvdHlwZS5wb3N0U2xpZGU9ZnVuY3Rpb24oYSl7dmFyIGI9dGhpcztiLiRzbGlkZXIudHJpZ2dlcihcImFmdGVyQ2hhbmdlXCIsW2IsYV0pLGIuYW5pbWF0aW5nPSExLGIuc2V0UG9zaXRpb24oKSxiLnN3aXBlTGVmdD1udWxsLGIub3B0aW9ucy5hdXRvcGxheT09PSEwJiZiLnBhdXNlZD09PSExJiZiLmF1dG9QbGF5KCksYi5vcHRpb25zLmFjY2Vzc2liaWxpdHk9PT0hMCYmYi5pbml0QURBKCl9LGIucHJvdG90eXBlLnByZXY9Yi5wcm90b3R5cGUuc2xpY2tQcmV2PWZ1bmN0aW9uKCl7dmFyIGE9dGhpczthLmNoYW5nZVNsaWRlKHtkYXRhOnttZXNzYWdlOlwicHJldmlvdXNcIn19KX0sYi5wcm90b3R5cGUucHJldmVudERlZmF1bHQ9ZnVuY3Rpb24oYSl7YS5wcmV2ZW50RGVmYXVsdCgpfSxiLnByb3RvdHlwZS5wcm9ncmVzc2l2ZUxhenlMb2FkPWZ1bmN0aW9uKCl7dmFyIGMsZCxiPXRoaXM7Yz1hKFwiaW1nW2RhdGEtbGF6eV1cIixiLiRzbGlkZXIpLmxlbmd0aCxjPjAmJihkPWEoXCJpbWdbZGF0YS1sYXp5XVwiLGIuJHNsaWRlcikuZmlyc3QoKSxkLmF0dHIoXCJzcmNcIixudWxsKSxkLmF0dHIoXCJzcmNcIixkLmF0dHIoXCJkYXRhLWxhenlcIikpLnJlbW92ZUNsYXNzKFwic2xpY2stbG9hZGluZ1wiKS5sb2FkKGZ1bmN0aW9uKCl7ZC5yZW1vdmVBdHRyKFwiZGF0YS1sYXp5XCIpLGIucHJvZ3Jlc3NpdmVMYXp5TG9hZCgpLGIub3B0aW9ucy5hZGFwdGl2ZUhlaWdodD09PSEwJiZiLnNldFBvc2l0aW9uKCl9KS5lcnJvcihmdW5jdGlvbigpe2QucmVtb3ZlQXR0cihcImRhdGEtbGF6eVwiKSxiLnByb2dyZXNzaXZlTGF6eUxvYWQoKX0pKX0sYi5wcm90b3R5cGUucmVmcmVzaD1mdW5jdGlvbihiKXt2YXIgZCxlLGM9dGhpcztlPWMuc2xpZGVDb3VudC1jLm9wdGlvbnMuc2xpZGVzVG9TaG93LGMub3B0aW9ucy5pbmZpbml0ZXx8KGMuc2xpZGVDb3VudDw9Yy5vcHRpb25zLnNsaWRlc1RvU2hvdz9jLmN1cnJlbnRTbGlkZT0wOmMuY3VycmVudFNsaWRlPmUmJihjLmN1cnJlbnRTbGlkZT1lKSksZD1jLmN1cnJlbnRTbGlkZSxjLmRlc3Ryb3koITApLGEuZXh0ZW5kKGMsYy5pbml0aWFscyx7Y3VycmVudFNsaWRlOmR9KSxjLmluaXQoKSxifHxjLmNoYW5nZVNsaWRlKHtkYXRhOnttZXNzYWdlOlwiaW5kZXhcIixpbmRleDpkfX0sITEpfSxiLnByb3RvdHlwZS5yZWdpc3RlckJyZWFrcG9pbnRzPWZ1bmN0aW9uKCl7dmFyIGMsZCxlLGI9dGhpcyxmPWIub3B0aW9ucy5yZXNwb25zaXZlfHxudWxsO2lmKFwiYXJyYXlcIj09PWEudHlwZShmKSYmZi5sZW5ndGgpe2IucmVzcG9uZFRvPWIub3B0aW9ucy5yZXNwb25kVG98fFwid2luZG93XCI7Zm9yKGMgaW4gZilpZihlPWIuYnJlYWtwb2ludHMubGVuZ3RoLTEsZD1mW2NdLmJyZWFrcG9pbnQsZi5oYXNPd25Qcm9wZXJ0eShjKSl7Zm9yKDtlPj0wOyliLmJyZWFrcG9pbnRzW2VdJiZiLmJyZWFrcG9pbnRzW2VdPT09ZCYmYi5icmVha3BvaW50cy5zcGxpY2UoZSwxKSxlLS07Yi5icmVha3BvaW50cy5wdXNoKGQpLGIuYnJlYWtwb2ludFNldHRpbmdzW2RdPWZbY10uc2V0dGluZ3N9Yi5icmVha3BvaW50cy5zb3J0KGZ1bmN0aW9uKGEsYyl7cmV0dXJuIGIub3B0aW9ucy5tb2JpbGVGaXJzdD9hLWM6Yy1hfSl9fSxiLnByb3RvdHlwZS5yZWluaXQ9ZnVuY3Rpb24oKXt2YXIgYj10aGlzO2IuJHNsaWRlcz1iLiRzbGlkZVRyYWNrLmNoaWxkcmVuKGIub3B0aW9ucy5zbGlkZSkuYWRkQ2xhc3MoXCJzbGljay1zbGlkZVwiKSxiLnNsaWRlQ291bnQ9Yi4kc2xpZGVzLmxlbmd0aCxiLmN1cnJlbnRTbGlkZT49Yi5zbGlkZUNvdW50JiYwIT09Yi5jdXJyZW50U2xpZGUmJihiLmN1cnJlbnRTbGlkZT1iLmN1cnJlbnRTbGlkZS1iLm9wdGlvbnMuc2xpZGVzVG9TY3JvbGwpLGIuc2xpZGVDb3VudDw9Yi5vcHRpb25zLnNsaWRlc1RvU2hvdyYmKGIuY3VycmVudFNsaWRlPTApLGIucmVnaXN0ZXJCcmVha3BvaW50cygpLGIuc2V0UHJvcHMoKSxiLnNldHVwSW5maW5pdGUoKSxiLmJ1aWxkQXJyb3dzKCksYi51cGRhdGVBcnJvd3MoKSxiLmluaXRBcnJvd0V2ZW50cygpLGIuYnVpbGREb3RzKCksYi51cGRhdGVEb3RzKCksYi5pbml0RG90RXZlbnRzKCksYi5jaGVja1Jlc3BvbnNpdmUoITEsITApLGIub3B0aW9ucy5mb2N1c09uU2VsZWN0PT09ITAmJmEoYi4kc2xpZGVUcmFjaykuY2hpbGRyZW4oKS5vbihcImNsaWNrLnNsaWNrXCIsYi5zZWxlY3RIYW5kbGVyKSxiLnNldFNsaWRlQ2xhc3NlcygwKSxiLnNldFBvc2l0aW9uKCksYi4kc2xpZGVyLnRyaWdnZXIoXCJyZUluaXRcIixbYl0pLGIub3B0aW9ucy5hdXRvcGxheT09PSEwJiZiLmZvY3VzSGFuZGxlcigpfSxiLnByb3RvdHlwZS5yZXNpemU9ZnVuY3Rpb24oKXt2YXIgYj10aGlzO2Eod2luZG93KS53aWR0aCgpIT09Yi53aW5kb3dXaWR0aCYmKGNsZWFyVGltZW91dChiLndpbmRvd0RlbGF5KSxiLndpbmRvd0RlbGF5PXdpbmRvdy5zZXRUaW1lb3V0KGZ1bmN0aW9uKCl7Yi53aW5kb3dXaWR0aD1hKHdpbmRvdykud2lkdGgoKSxiLmNoZWNrUmVzcG9uc2l2ZSgpLGIudW5zbGlja2VkfHxiLnNldFBvc2l0aW9uKCl9LDUwKSl9LGIucHJvdG90eXBlLnJlbW92ZVNsaWRlPWIucHJvdG90eXBlLnNsaWNrUmVtb3ZlPWZ1bmN0aW9uKGEsYixjKXt2YXIgZD10aGlzO3JldHVyblwiYm9vbGVhblwiPT10eXBlb2YgYT8oYj1hLGE9Yj09PSEwPzA6ZC5zbGlkZUNvdW50LTEpOmE9Yj09PSEwPy0tYTphLGQuc2xpZGVDb3VudDwxfHwwPmF8fGE+ZC5zbGlkZUNvdW50LTE/ITE6KGQudW5sb2FkKCksYz09PSEwP2QuJHNsaWRlVHJhY2suY2hpbGRyZW4oKS5yZW1vdmUoKTpkLiRzbGlkZVRyYWNrLmNoaWxkcmVuKHRoaXMub3B0aW9ucy5zbGlkZSkuZXEoYSkucmVtb3ZlKCksZC4kc2xpZGVzPWQuJHNsaWRlVHJhY2suY2hpbGRyZW4odGhpcy5vcHRpb25zLnNsaWRlKSxkLiRzbGlkZVRyYWNrLmNoaWxkcmVuKHRoaXMub3B0aW9ucy5zbGlkZSkuZGV0YWNoKCksZC4kc2xpZGVUcmFjay5hcHBlbmQoZC4kc2xpZGVzKSxkLiRzbGlkZXNDYWNoZT1kLiRzbGlkZXMsdm9pZCBkLnJlaW5pdCgpKX0sYi5wcm90b3R5cGUuc2V0Q1NTPWZ1bmN0aW9uKGEpe3ZhciBkLGUsYj10aGlzLGM9e307Yi5vcHRpb25zLnJ0bD09PSEwJiYoYT0tYSksZD1cImxlZnRcIj09Yi5wb3NpdGlvblByb3A/TWF0aC5jZWlsKGEpK1wicHhcIjpcIjBweFwiLGU9XCJ0b3BcIj09Yi5wb3NpdGlvblByb3A/TWF0aC5jZWlsKGEpK1wicHhcIjpcIjBweFwiLGNbYi5wb3NpdGlvblByb3BdPWEsYi50cmFuc2Zvcm1zRW5hYmxlZD09PSExP2IuJHNsaWRlVHJhY2suY3NzKGMpOihjPXt9LGIuY3NzVHJhbnNpdGlvbnM9PT0hMT8oY1tiLmFuaW1UeXBlXT1cInRyYW5zbGF0ZShcIitkK1wiLCBcIitlK1wiKVwiLGIuJHNsaWRlVHJhY2suY3NzKGMpKTooY1tiLmFuaW1UeXBlXT1cInRyYW5zbGF0ZTNkKFwiK2QrXCIsIFwiK2UrXCIsIDBweClcIixiLiRzbGlkZVRyYWNrLmNzcyhjKSkpfSxiLnByb3RvdHlwZS5zZXREaW1lbnNpb25zPWZ1bmN0aW9uKCl7dmFyIGE9dGhpczthLm9wdGlvbnMudmVydGljYWw9PT0hMT9hLm9wdGlvbnMuY2VudGVyTW9kZT09PSEwJiZhLiRsaXN0LmNzcyh7cGFkZGluZzpcIjBweCBcIithLm9wdGlvbnMuY2VudGVyUGFkZGluZ30pOihhLiRsaXN0LmhlaWdodChhLiRzbGlkZXMuZmlyc3QoKS5vdXRlckhlaWdodCghMCkqYS5vcHRpb25zLnNsaWRlc1RvU2hvdyksYS5vcHRpb25zLmNlbnRlck1vZGU9PT0hMCYmYS4kbGlzdC5jc3Moe3BhZGRpbmc6YS5vcHRpb25zLmNlbnRlclBhZGRpbmcrXCIgMHB4XCJ9KSksYS5saXN0V2lkdGg9YS4kbGlzdC53aWR0aCgpLGEubGlzdEhlaWdodD1hLiRsaXN0LmhlaWdodCgpLGEub3B0aW9ucy52ZXJ0aWNhbD09PSExJiZhLm9wdGlvbnMudmFyaWFibGVXaWR0aD09PSExPyhhLnNsaWRlV2lkdGg9TWF0aC5jZWlsKGEubGlzdFdpZHRoL2Eub3B0aW9ucy5zbGlkZXNUb1Nob3cpLGEuJHNsaWRlVHJhY2sud2lkdGgoTWF0aC5jZWlsKGEuc2xpZGVXaWR0aCphLiRzbGlkZVRyYWNrLmNoaWxkcmVuKFwiLnNsaWNrLXNsaWRlXCIpLmxlbmd0aCkpKTphLm9wdGlvbnMudmFyaWFibGVXaWR0aD09PSEwP2EuJHNsaWRlVHJhY2sud2lkdGgoNWUzKmEuc2xpZGVDb3VudCk6KGEuc2xpZGVXaWR0aD1NYXRoLmNlaWwoYS5saXN0V2lkdGgpLGEuJHNsaWRlVHJhY2suaGVpZ2h0KE1hdGguY2VpbChhLiRzbGlkZXMuZmlyc3QoKS5vdXRlckhlaWdodCghMCkqYS4kc2xpZGVUcmFjay5jaGlsZHJlbihcIi5zbGljay1zbGlkZVwiKS5sZW5ndGgpKSk7dmFyIGI9YS4kc2xpZGVzLmZpcnN0KCkub3V0ZXJXaWR0aCghMCktYS4kc2xpZGVzLmZpcnN0KCkud2lkdGgoKTthLm9wdGlvbnMudmFyaWFibGVXaWR0aD09PSExJiZhLiRzbGlkZVRyYWNrLmNoaWxkcmVuKFwiLnNsaWNrLXNsaWRlXCIpLndpZHRoKGEuc2xpZGVXaWR0aC1iKX0sYi5wcm90b3R5cGUuc2V0RmFkZT1mdW5jdGlvbigpe3ZhciBjLGI9dGhpcztiLiRzbGlkZXMuZWFjaChmdW5jdGlvbihkLGUpe2M9Yi5zbGlkZVdpZHRoKmQqLTEsYi5vcHRpb25zLnJ0bD09PSEwP2EoZSkuY3NzKHtwb3NpdGlvbjpcInJlbGF0aXZlXCIscmlnaHQ6Yyx0b3A6MCx6SW5kZXg6Yi5vcHRpb25zLnpJbmRleC0yLG9wYWNpdHk6MH0pOmEoZSkuY3NzKHtwb3NpdGlvbjpcInJlbGF0aXZlXCIsbGVmdDpjLHRvcDowLHpJbmRleDpiLm9wdGlvbnMuekluZGV4LTIsb3BhY2l0eTowfSl9KSxiLiRzbGlkZXMuZXEoYi5jdXJyZW50U2xpZGUpLmNzcyh7ekluZGV4OmIub3B0aW9ucy56SW5kZXgtMSxvcGFjaXR5OjF9KX0sYi5wcm90b3R5cGUuc2V0SGVpZ2h0PWZ1bmN0aW9uKCl7dmFyIGE9dGhpcztpZigxPT09YS5vcHRpb25zLnNsaWRlc1RvU2hvdyYmYS5vcHRpb25zLmFkYXB0aXZlSGVpZ2h0PT09ITAmJmEub3B0aW9ucy52ZXJ0aWNhbD09PSExKXt2YXIgYj1hLiRzbGlkZXMuZXEoYS5jdXJyZW50U2xpZGUpLm91dGVySGVpZ2h0KCEwKTthLiRsaXN0LmNzcyhcImhlaWdodFwiLGIpfX0sYi5wcm90b3R5cGUuc2V0T3B0aW9uPWIucHJvdG90eXBlLnNsaWNrU2V0T3B0aW9uPWZ1bmN0aW9uKGIsYyxkKXt2YXIgZixnLGU9dGhpcztpZihcInJlc3BvbnNpdmVcIj09PWImJlwiYXJyYXlcIj09PWEudHlwZShjKSlmb3IoZyBpbiBjKWlmKFwiYXJyYXlcIiE9PWEudHlwZShlLm9wdGlvbnMucmVzcG9uc2l2ZSkpZS5vcHRpb25zLnJlc3BvbnNpdmU9W2NbZ11dO2Vsc2V7Zm9yKGY9ZS5vcHRpb25zLnJlc3BvbnNpdmUubGVuZ3RoLTE7Zj49MDspZS5vcHRpb25zLnJlc3BvbnNpdmVbZl0uYnJlYWtwb2ludD09PWNbZ10uYnJlYWtwb2ludCYmZS5vcHRpb25zLnJlc3BvbnNpdmUuc3BsaWNlKGYsMSksZi0tO2Uub3B0aW9ucy5yZXNwb25zaXZlLnB1c2goY1tnXSl9ZWxzZSBlLm9wdGlvbnNbYl09YztkPT09ITAmJihlLnVubG9hZCgpLGUucmVpbml0KCkpfSxiLnByb3RvdHlwZS5zZXRQb3NpdGlvbj1mdW5jdGlvbigpe3ZhciBhPXRoaXM7YS5zZXREaW1lbnNpb25zKCksYS5zZXRIZWlnaHQoKSxhLm9wdGlvbnMuZmFkZT09PSExP2Euc2V0Q1NTKGEuZ2V0TGVmdChhLmN1cnJlbnRTbGlkZSkpOmEuc2V0RmFkZSgpLGEuJHNsaWRlci50cmlnZ2VyKFwic2V0UG9zaXRpb25cIixbYV0pfSxiLnByb3RvdHlwZS5zZXRQcm9wcz1mdW5jdGlvbigpe3ZhciBhPXRoaXMsYj1kb2N1bWVudC5ib2R5LnN0eWxlO2EucG9zaXRpb25Qcm9wPWEub3B0aW9ucy52ZXJ0aWNhbD09PSEwP1widG9wXCI6XCJsZWZ0XCIsXCJ0b3BcIj09PWEucG9zaXRpb25Qcm9wP2EuJHNsaWRlci5hZGRDbGFzcyhcInNsaWNrLXZlcnRpY2FsXCIpOmEuJHNsaWRlci5yZW1vdmVDbGFzcyhcInNsaWNrLXZlcnRpY2FsXCIpLCh2b2lkIDAhPT1iLldlYmtpdFRyYW5zaXRpb258fHZvaWQgMCE9PWIuTW96VHJhbnNpdGlvbnx8dm9pZCAwIT09Yi5tc1RyYW5zaXRpb24pJiZhLm9wdGlvbnMudXNlQ1NTPT09ITAmJihhLmNzc1RyYW5zaXRpb25zPSEwKSxhLm9wdGlvbnMuZmFkZSYmKFwibnVtYmVyXCI9PXR5cGVvZiBhLm9wdGlvbnMuekluZGV4P2Eub3B0aW9ucy56SW5kZXg8MyYmKGEub3B0aW9ucy56SW5kZXg9Myk6YS5vcHRpb25zLnpJbmRleD1hLmRlZmF1bHRzLnpJbmRleCksdm9pZCAwIT09Yi5PVHJhbnNmb3JtJiYoYS5hbmltVHlwZT1cIk9UcmFuc2Zvcm1cIixhLnRyYW5zZm9ybVR5cGU9XCItby10cmFuc2Zvcm1cIixhLnRyYW5zaXRpb25UeXBlPVwiT1RyYW5zaXRpb25cIix2b2lkIDA9PT1iLnBlcnNwZWN0aXZlUHJvcGVydHkmJnZvaWQgMD09PWIud2Via2l0UGVyc3BlY3RpdmUmJihhLmFuaW1UeXBlPSExKSksdm9pZCAwIT09Yi5Nb3pUcmFuc2Zvcm0mJihhLmFuaW1UeXBlPVwiTW96VHJhbnNmb3JtXCIsYS50cmFuc2Zvcm1UeXBlPVwiLW1vei10cmFuc2Zvcm1cIixhLnRyYW5zaXRpb25UeXBlPVwiTW96VHJhbnNpdGlvblwiLHZvaWQgMD09PWIucGVyc3BlY3RpdmVQcm9wZXJ0eSYmdm9pZCAwPT09Yi5Nb3pQZXJzcGVjdGl2ZSYmKGEuYW5pbVR5cGU9ITEpKSx2b2lkIDAhPT1iLndlYmtpdFRyYW5zZm9ybSYmKGEuYW5pbVR5cGU9XCJ3ZWJraXRUcmFuc2Zvcm1cIixhLnRyYW5zZm9ybVR5cGU9XCItd2Via2l0LXRyYW5zZm9ybVwiLGEudHJhbnNpdGlvblR5cGU9XCJ3ZWJraXRUcmFuc2l0aW9uXCIsdm9pZCAwPT09Yi5wZXJzcGVjdGl2ZVByb3BlcnR5JiZ2b2lkIDA9PT1iLndlYmtpdFBlcnNwZWN0aXZlJiYoYS5hbmltVHlwZT0hMSkpLHZvaWQgMCE9PWIubXNUcmFuc2Zvcm0mJihhLmFuaW1UeXBlPVwibXNUcmFuc2Zvcm1cIixhLnRyYW5zZm9ybVR5cGU9XCItbXMtdHJhbnNmb3JtXCIsYS50cmFuc2l0aW9uVHlwZT1cIm1zVHJhbnNpdGlvblwiLHZvaWQgMD09PWIubXNUcmFuc2Zvcm0mJihhLmFuaW1UeXBlPSExKSksdm9pZCAwIT09Yi50cmFuc2Zvcm0mJmEuYW5pbVR5cGUhPT0hMSYmKGEuYW5pbVR5cGU9XCJ0cmFuc2Zvcm1cIixhLnRyYW5zZm9ybVR5cGU9XCJ0cmFuc2Zvcm1cIixhLnRyYW5zaXRpb25UeXBlPVwidHJhbnNpdGlvblwiKSxhLnRyYW5zZm9ybXNFbmFibGVkPWEub3B0aW9ucy51c2VUcmFuc2Zvcm0mJm51bGwhPT1hLmFuaW1UeXBlJiZhLmFuaW1UeXBlIT09ITF9LGIucHJvdG90eXBlLnNldFNsaWRlQ2xhc3Nlcz1mdW5jdGlvbihhKXt2YXIgYyxkLGUsZixiPXRoaXM7ZD1iLiRzbGlkZXIuZmluZChcIi5zbGljay1zbGlkZVwiKS5yZW1vdmVDbGFzcyhcInNsaWNrLWFjdGl2ZSBzbGljay1jZW50ZXIgc2xpY2stY3VycmVudFwiKS5hdHRyKFwiYXJpYS1oaWRkZW5cIixcInRydWVcIiksYi4kc2xpZGVzLmVxKGEpLmFkZENsYXNzKFwic2xpY2stY3VycmVudFwiKSxiLm9wdGlvbnMuY2VudGVyTW9kZT09PSEwPyhjPU1hdGguZmxvb3IoYi5vcHRpb25zLnNsaWRlc1RvU2hvdy8yKSxiLm9wdGlvbnMuaW5maW5pdGU9PT0hMCYmKGE+PWMmJmE8PWIuc2xpZGVDb3VudC0xLWM/Yi4kc2xpZGVzLnNsaWNlKGEtYyxhK2MrMSkuYWRkQ2xhc3MoXCJzbGljay1hY3RpdmVcIikuYXR0cihcImFyaWEtaGlkZGVuXCIsXCJmYWxzZVwiKTooZT1iLm9wdGlvbnMuc2xpZGVzVG9TaG93K2EsZC5zbGljZShlLWMrMSxlK2MrMikuYWRkQ2xhc3MoXCJzbGljay1hY3RpdmVcIikuYXR0cihcImFyaWEtaGlkZGVuXCIsXCJmYWxzZVwiKSksMD09PWE/ZC5lcShkLmxlbmd0aC0xLWIub3B0aW9ucy5zbGlkZXNUb1Nob3cpLmFkZENsYXNzKFwic2xpY2stY2VudGVyXCIpOmE9PT1iLnNsaWRlQ291bnQtMSYmZC5lcShiLm9wdGlvbnMuc2xpZGVzVG9TaG93KS5hZGRDbGFzcyhcInNsaWNrLWNlbnRlclwiKSksYi4kc2xpZGVzLmVxKGEpLmFkZENsYXNzKFwic2xpY2stY2VudGVyXCIpKTphPj0wJiZhPD1iLnNsaWRlQ291bnQtYi5vcHRpb25zLnNsaWRlc1RvU2hvdz9iLiRzbGlkZXMuc2xpY2UoYSxhK2Iub3B0aW9ucy5zbGlkZXNUb1Nob3cpLmFkZENsYXNzKFwic2xpY2stYWN0aXZlXCIpLmF0dHIoXCJhcmlhLWhpZGRlblwiLFwiZmFsc2VcIik6ZC5sZW5ndGg8PWIub3B0aW9ucy5zbGlkZXNUb1Nob3c/ZC5hZGRDbGFzcyhcInNsaWNrLWFjdGl2ZVwiKS5hdHRyKFwiYXJpYS1oaWRkZW5cIixcImZhbHNlXCIpOihmPWIuc2xpZGVDb3VudCViLm9wdGlvbnMuc2xpZGVzVG9TaG93LGU9Yi5vcHRpb25zLmluZmluaXRlPT09ITA/Yi5vcHRpb25zLnNsaWRlc1RvU2hvdythOmEsYi5vcHRpb25zLnNsaWRlc1RvU2hvdz09Yi5vcHRpb25zLnNsaWRlc1RvU2Nyb2xsJiZiLnNsaWRlQ291bnQtYTxiLm9wdGlvbnMuc2xpZGVzVG9TaG93P2Quc2xpY2UoZS0oYi5vcHRpb25zLnNsaWRlc1RvU2hvdy1mKSxlK2YpLmFkZENsYXNzKFwic2xpY2stYWN0aXZlXCIpLmF0dHIoXCJhcmlhLWhpZGRlblwiLFwiZmFsc2VcIik6ZC5zbGljZShlLGUrYi5vcHRpb25zLnNsaWRlc1RvU2hvdykuYWRkQ2xhc3MoXCJzbGljay1hY3RpdmVcIikuYXR0cihcImFyaWEtaGlkZGVuXCIsXCJmYWxzZVwiKSksXCJvbmRlbWFuZFwiPT09Yi5vcHRpb25zLmxhenlMb2FkJiZiLmxhenlMb2FkKCl9LGIucHJvdG90eXBlLnNldHVwSW5maW5pdGU9ZnVuY3Rpb24oKXt2YXIgYyxkLGUsYj10aGlzO2lmKGIub3B0aW9ucy5mYWRlPT09ITAmJihiLm9wdGlvbnMuY2VudGVyTW9kZT0hMSksYi5vcHRpb25zLmluZmluaXRlPT09ITAmJmIub3B0aW9ucy5mYWRlPT09ITEmJihkPW51bGwsYi5zbGlkZUNvdW50PmIub3B0aW9ucy5zbGlkZXNUb1Nob3cpKXtmb3IoZT1iLm9wdGlvbnMuY2VudGVyTW9kZT09PSEwP2Iub3B0aW9ucy5zbGlkZXNUb1Nob3crMTpiLm9wdGlvbnMuc2xpZGVzVG9TaG93LGM9Yi5zbGlkZUNvdW50O2M+Yi5zbGlkZUNvdW50LWU7Yy09MSlkPWMtMSxhKGIuJHNsaWRlc1tkXSkuY2xvbmUoITApLmF0dHIoXCJpZFwiLFwiXCIpLmF0dHIoXCJkYXRhLXNsaWNrLWluZGV4XCIsZC1iLnNsaWRlQ291bnQpLnByZXBlbmRUbyhiLiRzbGlkZVRyYWNrKS5hZGRDbGFzcyhcInNsaWNrLWNsb25lZFwiKTtmb3IoYz0wO2U+YztjKz0xKWQ9YyxhKGIuJHNsaWRlc1tkXSkuY2xvbmUoITApLmF0dHIoXCJpZFwiLFwiXCIpLmF0dHIoXCJkYXRhLXNsaWNrLWluZGV4XCIsZCtiLnNsaWRlQ291bnQpLmFwcGVuZFRvKGIuJHNsaWRlVHJhY2spLmFkZENsYXNzKFwic2xpY2stY2xvbmVkXCIpO2IuJHNsaWRlVHJhY2suZmluZChcIi5zbGljay1jbG9uZWRcIikuZmluZChcIltpZF1cIikuZWFjaChmdW5jdGlvbigpe2EodGhpcykuYXR0cihcImlkXCIsXCJcIil9KX19LGIucHJvdG90eXBlLnNldFBhdXNlZD1mdW5jdGlvbihhKXt2YXIgYj10aGlzO2Iub3B0aW9ucy5hdXRvcGxheT09PSEwJiZiLm9wdGlvbnMucGF1c2VPbkhvdmVyPT09ITAmJihiLnBhdXNlZD1hLGE/Yi5hdXRvUGxheUNsZWFyKCk6Yi5hdXRvUGxheSgpKX0sYi5wcm90b3R5cGUuc2VsZWN0SGFuZGxlcj1mdW5jdGlvbihiKXt2YXIgYz10aGlzLGQ9YShiLnRhcmdldCkuaXMoXCIuc2xpY2stc2xpZGVcIik/YShiLnRhcmdldCk6YShiLnRhcmdldCkucGFyZW50cyhcIi5zbGljay1zbGlkZVwiKSxlPXBhcnNlSW50KGQuYXR0cihcImRhdGEtc2xpY2staW5kZXhcIikpO3JldHVybiBlfHwoZT0wKSxjLnNsaWRlQ291bnQ8PWMub3B0aW9ucy5zbGlkZXNUb1Nob3c/KGMuc2V0U2xpZGVDbGFzc2VzKGUpLHZvaWQgYy5hc05hdkZvcihlKSk6dm9pZCBjLnNsaWRlSGFuZGxlcihlKX0sYi5wcm90b3R5cGUuc2xpZGVIYW5kbGVyPWZ1bmN0aW9uKGEsYixjKXt2YXIgZCxlLGYsZyxoPW51bGwsaT10aGlzO3JldHVybiBiPWJ8fCExLGkuYW5pbWF0aW5nPT09ITAmJmkub3B0aW9ucy53YWl0Rm9yQW5pbWF0ZT09PSEwfHxpLm9wdGlvbnMuZmFkZT09PSEwJiZpLmN1cnJlbnRTbGlkZT09PWF8fGkuc2xpZGVDb3VudDw9aS5vcHRpb25zLnNsaWRlc1RvU2hvdz92b2lkIDA6KGI9PT0hMSYmaS5hc05hdkZvcihhKSxkPWEsaD1pLmdldExlZnQoZCksZz1pLmdldExlZnQoaS5jdXJyZW50U2xpZGUpLGkuY3VycmVudExlZnQ9bnVsbD09PWkuc3dpcGVMZWZ0P2c6aS5zd2lwZUxlZnQsaS5vcHRpb25zLmluZmluaXRlPT09ITEmJmkub3B0aW9ucy5jZW50ZXJNb2RlPT09ITEmJigwPmF8fGE+aS5nZXREb3RDb3VudCgpKmkub3B0aW9ucy5zbGlkZXNUb1Njcm9sbCk/dm9pZChpLm9wdGlvbnMuZmFkZT09PSExJiYoZD1pLmN1cnJlbnRTbGlkZSxjIT09ITA/aS5hbmltYXRlU2xpZGUoZyxmdW5jdGlvbigpe2kucG9zdFNsaWRlKGQpO1xufSk6aS5wb3N0U2xpZGUoZCkpKTppLm9wdGlvbnMuaW5maW5pdGU9PT0hMSYmaS5vcHRpb25zLmNlbnRlck1vZGU9PT0hMCYmKDA+YXx8YT5pLnNsaWRlQ291bnQtaS5vcHRpb25zLnNsaWRlc1RvU2Nyb2xsKT92b2lkKGkub3B0aW9ucy5mYWRlPT09ITEmJihkPWkuY3VycmVudFNsaWRlLGMhPT0hMD9pLmFuaW1hdGVTbGlkZShnLGZ1bmN0aW9uKCl7aS5wb3N0U2xpZGUoZCl9KTppLnBvc3RTbGlkZShkKSkpOihpLm9wdGlvbnMuYXV0b3BsYXk9PT0hMCYmY2xlYXJJbnRlcnZhbChpLmF1dG9QbGF5VGltZXIpLGU9MD5kP2kuc2xpZGVDb3VudCVpLm9wdGlvbnMuc2xpZGVzVG9TY3JvbGwhPT0wP2kuc2xpZGVDb3VudC1pLnNsaWRlQ291bnQlaS5vcHRpb25zLnNsaWRlc1RvU2Nyb2xsOmkuc2xpZGVDb3VudCtkOmQ+PWkuc2xpZGVDb3VudD9pLnNsaWRlQ291bnQlaS5vcHRpb25zLnNsaWRlc1RvU2Nyb2xsIT09MD8wOmQtaS5zbGlkZUNvdW50OmQsaS5hbmltYXRpbmc9ITAsaS4kc2xpZGVyLnRyaWdnZXIoXCJiZWZvcmVDaGFuZ2VcIixbaSxpLmN1cnJlbnRTbGlkZSxlXSksZj1pLmN1cnJlbnRTbGlkZSxpLmN1cnJlbnRTbGlkZT1lLGkuc2V0U2xpZGVDbGFzc2VzKGkuY3VycmVudFNsaWRlKSxpLnVwZGF0ZURvdHMoKSxpLnVwZGF0ZUFycm93cygpLGkub3B0aW9ucy5mYWRlPT09ITA/KGMhPT0hMD8oaS5mYWRlU2xpZGVPdXQoZiksaS5mYWRlU2xpZGUoZSxmdW5jdGlvbigpe2kucG9zdFNsaWRlKGUpfSkpOmkucG9zdFNsaWRlKGUpLHZvaWQgaS5hbmltYXRlSGVpZ2h0KCkpOnZvaWQoYyE9PSEwP2kuYW5pbWF0ZVNsaWRlKGgsZnVuY3Rpb24oKXtpLnBvc3RTbGlkZShlKX0pOmkucG9zdFNsaWRlKGUpKSkpfSxiLnByb3RvdHlwZS5zdGFydExvYWQ9ZnVuY3Rpb24oKXt2YXIgYT10aGlzO2Eub3B0aW9ucy5hcnJvd3M9PT0hMCYmYS5zbGlkZUNvdW50PmEub3B0aW9ucy5zbGlkZXNUb1Nob3cmJihhLiRwcmV2QXJyb3cuaGlkZSgpLGEuJG5leHRBcnJvdy5oaWRlKCkpLGEub3B0aW9ucy5kb3RzPT09ITAmJmEuc2xpZGVDb3VudD5hLm9wdGlvbnMuc2xpZGVzVG9TaG93JiZhLiRkb3RzLmhpZGUoKSxhLiRzbGlkZXIuYWRkQ2xhc3MoXCJzbGljay1sb2FkaW5nXCIpfSxiLnByb3RvdHlwZS5zd2lwZURpcmVjdGlvbj1mdW5jdGlvbigpe3ZhciBhLGIsYyxkLGU9dGhpcztyZXR1cm4gYT1lLnRvdWNoT2JqZWN0LnN0YXJ0WC1lLnRvdWNoT2JqZWN0LmN1clgsYj1lLnRvdWNoT2JqZWN0LnN0YXJ0WS1lLnRvdWNoT2JqZWN0LmN1clksYz1NYXRoLmF0YW4yKGIsYSksZD1NYXRoLnJvdW5kKDE4MCpjL01hdGguUEkpLDA+ZCYmKGQ9MzYwLU1hdGguYWJzKGQpKSw0NT49ZCYmZD49MD9lLm9wdGlvbnMucnRsPT09ITE/XCJsZWZ0XCI6XCJyaWdodFwiOjM2MD49ZCYmZD49MzE1P2Uub3B0aW9ucy5ydGw9PT0hMT9cImxlZnRcIjpcInJpZ2h0XCI6ZD49MTM1JiYyMjU+PWQ/ZS5vcHRpb25zLnJ0bD09PSExP1wicmlnaHRcIjpcImxlZnRcIjplLm9wdGlvbnMudmVydGljYWxTd2lwaW5nPT09ITA/ZD49MzUmJjEzNT49ZD9cImxlZnRcIjpcInJpZ2h0XCI6XCJ2ZXJ0aWNhbFwifSxiLnByb3RvdHlwZS5zd2lwZUVuZD1mdW5jdGlvbihhKXt2YXIgYyxiPXRoaXM7aWYoYi5kcmFnZ2luZz0hMSxiLnNob3VsZENsaWNrPWIudG91Y2hPYmplY3Quc3dpcGVMZW5ndGg+MTA/ITE6ITAsdm9pZCAwPT09Yi50b3VjaE9iamVjdC5jdXJYKXJldHVybiExO2lmKGIudG91Y2hPYmplY3QuZWRnZUhpdD09PSEwJiZiLiRzbGlkZXIudHJpZ2dlcihcImVkZ2VcIixbYixiLnN3aXBlRGlyZWN0aW9uKCldKSxiLnRvdWNoT2JqZWN0LnN3aXBlTGVuZ3RoPj1iLnRvdWNoT2JqZWN0Lm1pblN3aXBlKXN3aXRjaChiLnN3aXBlRGlyZWN0aW9uKCkpe2Nhc2VcImxlZnRcIjpjPWIub3B0aW9ucy5zd2lwZVRvU2xpZGU/Yi5jaGVja05hdmlnYWJsZShiLmN1cnJlbnRTbGlkZStiLmdldFNsaWRlQ291bnQoKSk6Yi5jdXJyZW50U2xpZGUrYi5nZXRTbGlkZUNvdW50KCksYi5zbGlkZUhhbmRsZXIoYyksYi5jdXJyZW50RGlyZWN0aW9uPTAsYi50b3VjaE9iamVjdD17fSxiLiRzbGlkZXIudHJpZ2dlcihcInN3aXBlXCIsW2IsXCJsZWZ0XCJdKTticmVhaztjYXNlXCJyaWdodFwiOmM9Yi5vcHRpb25zLnN3aXBlVG9TbGlkZT9iLmNoZWNrTmF2aWdhYmxlKGIuY3VycmVudFNsaWRlLWIuZ2V0U2xpZGVDb3VudCgpKTpiLmN1cnJlbnRTbGlkZS1iLmdldFNsaWRlQ291bnQoKSxiLnNsaWRlSGFuZGxlcihjKSxiLmN1cnJlbnREaXJlY3Rpb249MSxiLnRvdWNoT2JqZWN0PXt9LGIuJHNsaWRlci50cmlnZ2VyKFwic3dpcGVcIixbYixcInJpZ2h0XCJdKX1lbHNlIGIudG91Y2hPYmplY3Quc3RhcnRYIT09Yi50b3VjaE9iamVjdC5jdXJYJiYoYi5zbGlkZUhhbmRsZXIoYi5jdXJyZW50U2xpZGUpLGIudG91Y2hPYmplY3Q9e30pfSxiLnByb3RvdHlwZS5zd2lwZUhhbmRsZXI9ZnVuY3Rpb24oYSl7dmFyIGI9dGhpcztpZighKGIub3B0aW9ucy5zd2lwZT09PSExfHxcIm9udG91Y2hlbmRcImluIGRvY3VtZW50JiZiLm9wdGlvbnMuc3dpcGU9PT0hMXx8Yi5vcHRpb25zLmRyYWdnYWJsZT09PSExJiYtMSE9PWEudHlwZS5pbmRleE9mKFwibW91c2VcIikpKXN3aXRjaChiLnRvdWNoT2JqZWN0LmZpbmdlckNvdW50PWEub3JpZ2luYWxFdmVudCYmdm9pZCAwIT09YS5vcmlnaW5hbEV2ZW50LnRvdWNoZXM/YS5vcmlnaW5hbEV2ZW50LnRvdWNoZXMubGVuZ3RoOjEsYi50b3VjaE9iamVjdC5taW5Td2lwZT1iLmxpc3RXaWR0aC9iLm9wdGlvbnMudG91Y2hUaHJlc2hvbGQsYi5vcHRpb25zLnZlcnRpY2FsU3dpcGluZz09PSEwJiYoYi50b3VjaE9iamVjdC5taW5Td2lwZT1iLmxpc3RIZWlnaHQvYi5vcHRpb25zLnRvdWNoVGhyZXNob2xkKSxhLmRhdGEuYWN0aW9uKXtjYXNlXCJzdGFydFwiOmIuc3dpcGVTdGFydChhKTticmVhaztjYXNlXCJtb3ZlXCI6Yi5zd2lwZU1vdmUoYSk7YnJlYWs7Y2FzZVwiZW5kXCI6Yi5zd2lwZUVuZChhKX19LGIucHJvdG90eXBlLnN3aXBlTW92ZT1mdW5jdGlvbihhKXt2YXIgZCxlLGYsZyxoLGI9dGhpcztyZXR1cm4gaD12b2lkIDAhPT1hLm9yaWdpbmFsRXZlbnQ/YS5vcmlnaW5hbEV2ZW50LnRvdWNoZXM6bnVsbCwhYi5kcmFnZ2luZ3x8aCYmMSE9PWgubGVuZ3RoPyExOihkPWIuZ2V0TGVmdChiLmN1cnJlbnRTbGlkZSksYi50b3VjaE9iamVjdC5jdXJYPXZvaWQgMCE9PWg/aFswXS5wYWdlWDphLmNsaWVudFgsYi50b3VjaE9iamVjdC5jdXJZPXZvaWQgMCE9PWg/aFswXS5wYWdlWTphLmNsaWVudFksYi50b3VjaE9iamVjdC5zd2lwZUxlbmd0aD1NYXRoLnJvdW5kKE1hdGguc3FydChNYXRoLnBvdyhiLnRvdWNoT2JqZWN0LmN1clgtYi50b3VjaE9iamVjdC5zdGFydFgsMikpKSxiLm9wdGlvbnMudmVydGljYWxTd2lwaW5nPT09ITAmJihiLnRvdWNoT2JqZWN0LnN3aXBlTGVuZ3RoPU1hdGgucm91bmQoTWF0aC5zcXJ0KE1hdGgucG93KGIudG91Y2hPYmplY3QuY3VyWS1iLnRvdWNoT2JqZWN0LnN0YXJ0WSwyKSkpKSxlPWIuc3dpcGVEaXJlY3Rpb24oKSxcInZlcnRpY2FsXCIhPT1lPyh2b2lkIDAhPT1hLm9yaWdpbmFsRXZlbnQmJmIudG91Y2hPYmplY3Quc3dpcGVMZW5ndGg+NCYmYS5wcmV2ZW50RGVmYXVsdCgpLGc9KGIub3B0aW9ucy5ydGw9PT0hMT8xOi0xKSooYi50b3VjaE9iamVjdC5jdXJYPmIudG91Y2hPYmplY3Quc3RhcnRYPzE6LTEpLGIub3B0aW9ucy52ZXJ0aWNhbFN3aXBpbmc9PT0hMCYmKGc9Yi50b3VjaE9iamVjdC5jdXJZPmIudG91Y2hPYmplY3Quc3RhcnRZPzE6LTEpLGY9Yi50b3VjaE9iamVjdC5zd2lwZUxlbmd0aCxiLnRvdWNoT2JqZWN0LmVkZ2VIaXQ9ITEsYi5vcHRpb25zLmluZmluaXRlPT09ITEmJigwPT09Yi5jdXJyZW50U2xpZGUmJlwicmlnaHRcIj09PWV8fGIuY3VycmVudFNsaWRlPj1iLmdldERvdENvdW50KCkmJlwibGVmdFwiPT09ZSkmJihmPWIudG91Y2hPYmplY3Quc3dpcGVMZW5ndGgqYi5vcHRpb25zLmVkZ2VGcmljdGlvbixiLnRvdWNoT2JqZWN0LmVkZ2VIaXQ9ITApLGIub3B0aW9ucy52ZXJ0aWNhbD09PSExP2Iuc3dpcGVMZWZ0PWQrZipnOmIuc3dpcGVMZWZ0PWQrZiooYi4kbGlzdC5oZWlnaHQoKS9iLmxpc3RXaWR0aCkqZyxiLm9wdGlvbnMudmVydGljYWxTd2lwaW5nPT09ITAmJihiLnN3aXBlTGVmdD1kK2YqZyksYi5vcHRpb25zLmZhZGU9PT0hMHx8Yi5vcHRpb25zLnRvdWNoTW92ZT09PSExPyExOmIuYW5pbWF0aW5nPT09ITA/KGIuc3dpcGVMZWZ0PW51bGwsITEpOnZvaWQgYi5zZXRDU1MoYi5zd2lwZUxlZnQpKTp2b2lkIDApfSxiLnByb3RvdHlwZS5zd2lwZVN0YXJ0PWZ1bmN0aW9uKGEpe3ZhciBjLGI9dGhpcztyZXR1cm4gMSE9PWIudG91Y2hPYmplY3QuZmluZ2VyQ291bnR8fGIuc2xpZGVDb3VudDw9Yi5vcHRpb25zLnNsaWRlc1RvU2hvdz8oYi50b3VjaE9iamVjdD17fSwhMSk6KHZvaWQgMCE9PWEub3JpZ2luYWxFdmVudCYmdm9pZCAwIT09YS5vcmlnaW5hbEV2ZW50LnRvdWNoZXMmJihjPWEub3JpZ2luYWxFdmVudC50b3VjaGVzWzBdKSxiLnRvdWNoT2JqZWN0LnN0YXJ0WD1iLnRvdWNoT2JqZWN0LmN1clg9dm9pZCAwIT09Yz9jLnBhZ2VYOmEuY2xpZW50WCxiLnRvdWNoT2JqZWN0LnN0YXJ0WT1iLnRvdWNoT2JqZWN0LmN1clk9dm9pZCAwIT09Yz9jLnBhZ2VZOmEuY2xpZW50WSx2b2lkKGIuZHJhZ2dpbmc9ITApKX0sYi5wcm90b3R5cGUudW5maWx0ZXJTbGlkZXM9Yi5wcm90b3R5cGUuc2xpY2tVbmZpbHRlcj1mdW5jdGlvbigpe3ZhciBhPXRoaXM7bnVsbCE9PWEuJHNsaWRlc0NhY2hlJiYoYS51bmxvYWQoKSxhLiRzbGlkZVRyYWNrLmNoaWxkcmVuKHRoaXMub3B0aW9ucy5zbGlkZSkuZGV0YWNoKCksYS4kc2xpZGVzQ2FjaGUuYXBwZW5kVG8oYS4kc2xpZGVUcmFjayksYS5yZWluaXQoKSl9LGIucHJvdG90eXBlLnVubG9hZD1mdW5jdGlvbigpe3ZhciBiPXRoaXM7YShcIi5zbGljay1jbG9uZWRcIixiLiRzbGlkZXIpLnJlbW92ZSgpLGIuJGRvdHMmJmIuJGRvdHMucmVtb3ZlKCksYi4kcHJldkFycm93JiZiLmh0bWxFeHByLnRlc3QoYi5vcHRpb25zLnByZXZBcnJvdykmJmIuJHByZXZBcnJvdy5yZW1vdmUoKSxiLiRuZXh0QXJyb3cmJmIuaHRtbEV4cHIudGVzdChiLm9wdGlvbnMubmV4dEFycm93KSYmYi4kbmV4dEFycm93LnJlbW92ZSgpLGIuJHNsaWRlcy5yZW1vdmVDbGFzcyhcInNsaWNrLXNsaWRlIHNsaWNrLWFjdGl2ZSBzbGljay12aXNpYmxlIHNsaWNrLWN1cnJlbnRcIikuYXR0cihcImFyaWEtaGlkZGVuXCIsXCJ0cnVlXCIpLmNzcyhcIndpZHRoXCIsXCJcIil9LGIucHJvdG90eXBlLnVuc2xpY2s9ZnVuY3Rpb24oYSl7dmFyIGI9dGhpcztiLiRzbGlkZXIudHJpZ2dlcihcInVuc2xpY2tcIixbYixhXSksYi5kZXN0cm95KCl9LGIucHJvdG90eXBlLnVwZGF0ZUFycm93cz1mdW5jdGlvbigpe3ZhciBiLGE9dGhpcztiPU1hdGguZmxvb3IoYS5vcHRpb25zLnNsaWRlc1RvU2hvdy8yKSxhLm9wdGlvbnMuYXJyb3dzPT09ITAmJmEuc2xpZGVDb3VudD5hLm9wdGlvbnMuc2xpZGVzVG9TaG93JiYhYS5vcHRpb25zLmluZmluaXRlJiYoYS4kcHJldkFycm93LnJlbW92ZUNsYXNzKFwic2xpY2stZGlzYWJsZWRcIikuYXR0cihcImFyaWEtZGlzYWJsZWRcIixcImZhbHNlXCIpLGEuJG5leHRBcnJvdy5yZW1vdmVDbGFzcyhcInNsaWNrLWRpc2FibGVkXCIpLmF0dHIoXCJhcmlhLWRpc2FibGVkXCIsXCJmYWxzZVwiKSwwPT09YS5jdXJyZW50U2xpZGU/KGEuJHByZXZBcnJvdy5hZGRDbGFzcyhcInNsaWNrLWRpc2FibGVkXCIpLmF0dHIoXCJhcmlhLWRpc2FibGVkXCIsXCJ0cnVlXCIpLGEuJG5leHRBcnJvdy5yZW1vdmVDbGFzcyhcInNsaWNrLWRpc2FibGVkXCIpLmF0dHIoXCJhcmlhLWRpc2FibGVkXCIsXCJmYWxzZVwiKSk6YS5jdXJyZW50U2xpZGU+PWEuc2xpZGVDb3VudC1hLm9wdGlvbnMuc2xpZGVzVG9TaG93JiZhLm9wdGlvbnMuY2VudGVyTW9kZT09PSExPyhhLiRuZXh0QXJyb3cuYWRkQ2xhc3MoXCJzbGljay1kaXNhYmxlZFwiKS5hdHRyKFwiYXJpYS1kaXNhYmxlZFwiLFwidHJ1ZVwiKSxhLiRwcmV2QXJyb3cucmVtb3ZlQ2xhc3MoXCJzbGljay1kaXNhYmxlZFwiKS5hdHRyKFwiYXJpYS1kaXNhYmxlZFwiLFwiZmFsc2VcIikpOmEuY3VycmVudFNsaWRlPj1hLnNsaWRlQ291bnQtMSYmYS5vcHRpb25zLmNlbnRlck1vZGU9PT0hMCYmKGEuJG5leHRBcnJvdy5hZGRDbGFzcyhcInNsaWNrLWRpc2FibGVkXCIpLmF0dHIoXCJhcmlhLWRpc2FibGVkXCIsXCJ0cnVlXCIpLGEuJHByZXZBcnJvdy5yZW1vdmVDbGFzcyhcInNsaWNrLWRpc2FibGVkXCIpLmF0dHIoXCJhcmlhLWRpc2FibGVkXCIsXCJmYWxzZVwiKSkpfSxiLnByb3RvdHlwZS51cGRhdGVEb3RzPWZ1bmN0aW9uKCl7dmFyIGE9dGhpcztudWxsIT09YS4kZG90cyYmKGEuJGRvdHMuZmluZChcImxpXCIpLnJlbW92ZUNsYXNzKFwic2xpY2stYWN0aXZlXCIpLmF0dHIoXCJhcmlhLWhpZGRlblwiLFwidHJ1ZVwiKSxhLiRkb3RzLmZpbmQoXCJsaVwiKS5lcShNYXRoLmZsb29yKGEuY3VycmVudFNsaWRlL2Eub3B0aW9ucy5zbGlkZXNUb1Njcm9sbCkpLmFkZENsYXNzKFwic2xpY2stYWN0aXZlXCIpLmF0dHIoXCJhcmlhLWhpZGRlblwiLFwiZmFsc2VcIikpfSxiLnByb3RvdHlwZS52aXNpYmlsaXR5PWZ1bmN0aW9uKCl7dmFyIGE9dGhpcztkb2N1bWVudFthLmhpZGRlbl0/KGEucGF1c2VkPSEwLGEuYXV0b1BsYXlDbGVhcigpKTphLm9wdGlvbnMuYXV0b3BsYXk9PT0hMCYmKGEucGF1c2VkPSExLGEuYXV0b1BsYXkoKSl9LGIucHJvdG90eXBlLmluaXRBREE9ZnVuY3Rpb24oKXt2YXIgYj10aGlzO2IuJHNsaWRlcy5hZGQoYi4kc2xpZGVUcmFjay5maW5kKFwiLnNsaWNrLWNsb25lZFwiKSkuYXR0cih7XCJhcmlhLWhpZGRlblwiOlwidHJ1ZVwiLHRhYmluZGV4OlwiLTFcIn0pLmZpbmQoXCJhLCBpbnB1dCwgYnV0dG9uLCBzZWxlY3RcIikuYXR0cih7dGFiaW5kZXg6XCItMVwifSksYi4kc2xpZGVUcmFjay5hdHRyKFwicm9sZVwiLFwibGlzdGJveFwiKSxiLiRzbGlkZXMubm90KGIuJHNsaWRlVHJhY2suZmluZChcIi5zbGljay1jbG9uZWRcIikpLmVhY2goZnVuY3Rpb24oYyl7YSh0aGlzKS5hdHRyKHtyb2xlOlwib3B0aW9uXCIsXCJhcmlhLWRlc2NyaWJlZGJ5XCI6XCJzbGljay1zbGlkZVwiK2IuaW5zdGFuY2VVaWQrY30pfSksbnVsbCE9PWIuJGRvdHMmJmIuJGRvdHMuYXR0cihcInJvbGVcIixcInRhYmxpc3RcIikuZmluZChcImxpXCIpLmVhY2goZnVuY3Rpb24oYyl7YSh0aGlzKS5hdHRyKHtyb2xlOlwicHJlc2VudGF0aW9uXCIsXCJhcmlhLXNlbGVjdGVkXCI6XCJmYWxzZVwiLFwiYXJpYS1jb250cm9sc1wiOlwibmF2aWdhdGlvblwiK2IuaW5zdGFuY2VVaWQrYyxpZDpcInNsaWNrLXNsaWRlXCIrYi5pbnN0YW5jZVVpZCtjfSl9KS5maXJzdCgpLmF0dHIoXCJhcmlhLXNlbGVjdGVkXCIsXCJ0cnVlXCIpLmVuZCgpLmZpbmQoXCJidXR0b25cIikuYXR0cihcInJvbGVcIixcImJ1dHRvblwiKS5lbmQoKS5jbG9zZXN0KFwiZGl2XCIpLmF0dHIoXCJyb2xlXCIsXCJ0b29sYmFyXCIpLGIuYWN0aXZhdGVBREEoKX0sYi5wcm90b3R5cGUuYWN0aXZhdGVBREE9ZnVuY3Rpb24oKXt2YXIgYT10aGlzO2EuJHNsaWRlVHJhY2suZmluZChcIi5zbGljay1hY3RpdmVcIikuYXR0cih7XCJhcmlhLWhpZGRlblwiOlwiZmFsc2VcIn0pLmZpbmQoXCJhLCBpbnB1dCwgYnV0dG9uLCBzZWxlY3RcIikuYXR0cih7dGFiaW5kZXg6XCIwXCJ9KX0sYi5wcm90b3R5cGUuZm9jdXNIYW5kbGVyPWZ1bmN0aW9uKCl7dmFyIGI9dGhpcztiLiRzbGlkZXIub24oXCJmb2N1cy5zbGljayBibHVyLnNsaWNrXCIsXCIqXCIsZnVuY3Rpb24oYyl7Yy5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTt2YXIgZD1hKHRoaXMpO3NldFRpbWVvdXQoZnVuY3Rpb24oKXtiLmlzUGxheSYmKGQuaXMoXCI6Zm9jdXNcIik/KGIuYXV0b1BsYXlDbGVhcigpLGIucGF1c2VkPSEwKTooYi5wYXVzZWQ9ITEsYi5hdXRvUGxheSgpKSl9LDApfSl9LGEuZm4uc2xpY2s9ZnVuY3Rpb24oKXt2YXIgZixnLGE9dGhpcyxjPWFyZ3VtZW50c1swXSxkPUFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywxKSxlPWEubGVuZ3RoO2ZvcihmPTA7ZT5mO2YrKylpZihcIm9iamVjdFwiPT10eXBlb2YgY3x8XCJ1bmRlZmluZWRcIj09dHlwZW9mIGM/YVtmXS5zbGljaz1uZXcgYihhW2ZdLGMpOmc9YVtmXS5zbGlja1tjXS5hcHBseShhW2ZdLnNsaWNrLGQpLFwidW5kZWZpbmVkXCIhPXR5cGVvZiBnKXJldHVybiBnO3JldHVybiBhfX0pOyIsIi8vIFRlc3RhbmRvIGFwcCBqc1xuXG4kKGRvY3VtZW50KS5yZWFkeShmdW5jdGlvbigpIHtcbiAgICAoZnVuY3Rpb24oJCkge1xuICAgICAgICAvLyBNYWluIE1lbnVcbiAgICAgICAgJCgnLm5hdi1pdGVtJykub24oe2NsaWNrOiBmdW5jdGlvbiggZXZlbnQgKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5ocmVmID09IFwiI1wiKSB7XG4gICAgICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vICQodGhpcykuZmluZCgnLm5hdi1zdWInKS50b2dnbGUoXCJzbG93XCIsIFwibGluZWFyXCIpO1xuICAgICAgICAgICAgJCh0aGlzKS5maW5kKCcubmF2LXN1YicpLmFuaW1hdGUoe1xuICAgICAgICAgICAgICAgIG9wYWNpdHk6ICdzaG93J1xuICAgICAgICAgICAgfSwgJ2Zhc3QnKTtcbiAgICAgICAgfSwgbW91c2VlbnRlcjogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAkKHRoaXMpLmZpbmQoJy5uYXYtc3ViJykuYW5pbWF0ZSh7XG4gICAgICAgICAgICAgICAgb3BhY2l0eTogJ3Nob3cnXG4gICAgICAgICAgICB9LCAnZmFzdCcpO1xuICAgICAgICB9LCBtb3VzZWxlYXZlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICQodGhpcykuZmluZCgnLm5hdi1zdWInKS5hbmltYXRlKHtcbiAgICAgICAgICAgICAgICBvcGFjaXR5OiAnaGlkZSdcbiAgICAgICAgICAgIH0sICdmYXN0Jyk7XG4gICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gTW9iaWxlIE1lbnVcbiAgICAgICAgLy8gJCgnLm1haW4tbmF2LW1lbnUnKS5jbGljayhmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gICAgIC8vIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIC8vICAgICAkKHRoaXMpLm5leHQoJy5tYWluLW5hdi1saXN0JykudG9nZ2xlKCk7XG5cbiAgICAgICAgLy8gfSk7XG4gICAgICAgICQoJy5tYWluLW5hdi1tZW51Jykub24oXCJjbGlja1wiLCBmdW5jdGlvbiggZXZlbnQgKSB7XG4gICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgdmFyIG5hdiA9ICQodGhpcykubmV4dCgnLm1haW4tbmF2LWxpc3QnKTtcbiAgICAgICAgICAgIG5hdi50b2dnbGUoKTtcbiAgICAgICAgICAgICQoXCIubWFpbi1uYXZcIikub24oXCJtb3VzZWxlYXZlXCIsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIG5hdi5zbGlkZVVwKFwic2xvd1wiKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICAkKHdpbmRvdykucmVzaXplKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICB2YXIgbmF2ID0gJCgnLm1haW4tbmF2LWxpc3QnKTtcbiAgICAgICAgICAgIGlmICgkKCcubWFpbi13cmFwcGVyJykud2lkdGgoKSA+IDk2OSApe1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdtYWlvciA5NzAnKTtcbiAgICAgICAgICAgICAgICBuYXYuc2hvdygpO1xuICAgICAgICAgICAgICAgICQoXCIubWFpbi1uYXZcIikub2ZmKFwibW91c2VsZWF2ZVwiKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbmF2LmhpZGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQWN0aXZlIE1lbnUgXG4gICAgICAgIC8vIHZhciBwZ3VybCA9IHdpbmRvdy5sb2NhdGlvbi5ocmVmLnN1YnN0cih3aW5kb3cubG9jYXRpb24uaHJlZi5sYXN0SW5kZXhPZihcIi9cIikrMSk7XG4gICAgICAgIC8vICQoXCIubWFpbi1uYXYtbGlzdCAubmF2LWxpbmtcIikuZWFjaChmdW5jdGlvbigpe1xuICAgICAgICAvLyAgICAgY29uc29sZS5sb2coJ3BndXJsPSAnICsgcGd1cmwpO1xuICAgICAgICAvLyAgICAgY29uc29sZS5sb2coJ2hyZWY9ICcgKyAkKHRoaXMpLmF0dHIoXCJocmVmXCIpKTtcbiAgICAgICAgLy8gICAgIGlmKCQodGhpcykuYXR0cihcImhyZWZcIikgPT0gcGd1cmwgfHwgJCh0aGlzKS5hdHRyKFwiaHJlZlwiKSA9PSAnJyApXG4gICAgICAgIC8vICAgICAgICAgJCh0aGlzKS5hZGRDbGFzcyhcIm5hdi1saW5rLS1hY3RpdmVcIik7XG4gICAgICAgIC8vIH0pXG5cbiAgICAgICAgLy8gU2xpZGVzIGNvbmZpZ1xuICAgICAgICAvLyBcbiAgICAgICAgLy8gXG4gICAgICAgICQoJ1tpZCQ9XCJzbGlkZS1saXN0XCJdJykuZWFjaChmdW5jdGlvbihpLCBvYmopIHtcbiAgICAgICAgICAgICQodGhpcykuc2xpY2soe1xuICAgICAgICAgICAgICAgIGRvdHM6ICQodGhpcykuZGF0YShcInNsaWRlLWRvdHNcIiksXG4gICAgICAgICAgICAgICAgYXJyb3dzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBzcGVlZDogMzAwLFxuICAgICAgICAgICAgICAgIGFkYXB0aXZlSGVpZ2h0OiAkKHRoaXMpLmRhdGEoXCJzbGlkZS1hZGFwSGVpZ2h0XCIpLFxuICAgICAgICAgICAgICAgIGF1dG9wbGF5OiAkKHRoaXMpLmRhdGEoXCJzbGlkZS1hdXRvcGxheVwiKSxcbiAgICAgICAgICAgICAgICBhdXRvcGxheVNwZWVkOiA1MDAwLFxuICAgICAgICAgICAgICAgIC8vIHZlcnRpY2FsOiAkKHRoaXMpLmRhdGEoXCJzbGlkZS12ZXJ0aWNhbFwiKSxcbiAgICAgICAgICAgICAgICBzbGlkZXNUb1Nob3c6ICQodGhpcykuZGF0YShcInNsaWRlLW51bVwiKSxcbiAgICAgICAgICAgICAgICBzbGlkZXNUb1Njcm9sbDogJCh0aGlzKS5kYXRhKFwic2xpZGUtbnVtXCIpLFxuICAgICAgICAgICAgICAgIHJlc3BvbnNpdmU6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWtwb2ludDogNjY3LFxuICAgICAgICAgICAgICAgICAgICAgICAgc2V0dGluZ3M6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzbGlkZXNUb1Nob3c6ICgkKHRoaXMpLmRhdGEoXCJzbGlkZS1yZXNwb25zaXZlXCIpKSA/ICQodGhpcykuZGF0YShcInNsaWRlLXJlc3BvbnNpdmVcIikgOiAxLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNsaWRlc1RvU2Nyb2xsOiAoJCh0aGlzKS5kYXRhKFwic2xpZGUtcmVzcG9uc2l2ZVwiKSkgPyAkKHRoaXMpLmRhdGEoXCJzbGlkZS1yZXNwb25zaXZlXCIpIDogMSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjZW50ZXJNb2RlOiAkKHRoaXMpLmRhdGEoXCJzbGlkZS1jZW50ZXJcIiksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyaWFibGVXaWR0aDogJCh0aGlzKS5kYXRhKFwic2xpZGUtY2VudGVyXCIpXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvKlxuICAgICAgICAkKCcjYmFubmVyLXNsaWRlLWxpc3QnKS5zbGljayh7XG4gICAgICAgICAgICBkb3RzOiBmYWxzZSxcbiAgICAgICAgICAgIGFycm93czogZmFsc2UsXG4gICAgICAgICAgICBzcGVlZDogMzAwLFxuICAgICAgICAgICAgc2xpZGVzVG9TaG93OiAxLFxuICAgICAgICAgICAgc2xpZGVzVG9TY3JvbGw6IDFcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJCgnI2ZvdG8tc2xpZGUtbGlzdCcpLnNsaWNrKHtcbiAgICAgICAgICAgIGRvdHM6IGZhbHNlLFxuICAgICAgICAgICAgYXJyb3dzOiBmYWxzZSxcbiAgICAgICAgICAgIC8vIGluZmluaXRlOiBmYWxzZSxcbiAgICAgICAgICAgIHNwZWVkOiAzMDAsXG4gICAgICAgICAgICBzbGlkZXNUb1Nob3c6IDQsXG4gICAgICAgICAgICBzbGlkZXNUb1Njcm9sbDogNCxcbiAgICAgICAgICAgIC8vIGNlbnRlck1vZGU6IHRydWUsXG4gICAgICAgICAgICByZXNwb25zaXZlOiBbXG4gICAgICAgICAgICAgICAgLy8ge1xuICAgICAgICAgICAgICAgIC8vICAgICBicmVha3BvaW50OiA2NjcsXG4gICAgICAgICAgICAgICAgLy8gICAgIHNldHRpbmdzOiB7XG4gICAgICAgICAgICAgICAgLy8gICAgICAgICBzbGlkZXNUb1Nob3c6IDIsXG4gICAgICAgICAgICAgICAgLy8gICAgICAgICBzbGlkZXNUb1Njcm9sbDogMlxuICAgICAgICAgICAgICAgIC8vICAgICAgICAgLy8gY2VudGVyTW9kZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAvLyAgICAgICAgIC8vIHZhcmlhYmxlV2lkdGg6IHRydWUsXG4gICAgICAgICAgICAgICAgLy8gICAgICAgICAvLyBzbGlkZXNUb1Nob3c6IDMsXG4gICAgICAgICAgICAgICAgLy8gICAgICAgICAvLyBzbGlkZXNUb1Njcm9sbDogM1xuICAgICAgICAgICAgICAgIC8vICAgICB9XG4gICAgICAgICAgICAgICAgLy8gfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrcG9pbnQ6IDY2NyxcbiAgICAgICAgICAgICAgICAgICAgc2V0dGluZ3M6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNsaWRlc1RvU2hvdzogMSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHNsaWRlc1RvU2Nyb2xsOiAxLFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gY2VudGVyTW9kZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBZb3UgY2FuIHVuc2xpY2sgYXQgYSBnaXZlbiBicmVha3BvaW50IG5vdyBieSBhZGRpbmc6XG4gICAgICAgICAgICAgICAgLy8gc2V0dGluZ3M6IFwidW5zbGlja1wiXG4gICAgICAgICAgICAgICAgLy8gaW5zdGVhZCBvZiBhIHNldHRpbmdzIG9iamVjdFxuICAgICAgICAgICAgXVxuICAgICAgICB9KTtcblxuICAgICAgICAkKCcjcG9ydGlmb2xpby1zbGlkZS1saXN0Jykuc2xpY2soe1xuICAgICAgICAgICAgZG90czogZmFsc2UsXG4gICAgICAgICAgICBhcnJvd3M6IGZhbHNlLFxuICAgICAgICAgICAgc3BlZWQ6IDMwMCxcbiAgICAgICAgICAgIHNsaWRlc1RvU2hvdzogMyxcbiAgICAgICAgICAgIHNsaWRlc1RvU2Nyb2xsOiAzLFxuICAgICAgICAgICAgcmVzcG9uc2l2ZTogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWtwb2ludDogNjY3LFxuICAgICAgICAgICAgICAgICAgICBzZXR0aW5nczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2VudGVyTW9kZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhcmlhYmxlV2lkdGg6IHRydWVcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgJCgnI3NlcnZpY2Utc2xpZGUtbGlzdCcpLnNsaWNrKHtcbiAgICAgICAgICAgIGRvdHM6IGZhbHNlLFxuICAgICAgICAgICAgYXJyb3dzOiBmYWxzZSxcbiAgICAgICAgICAgIHNwZWVkOiAzMDAsXG4gICAgICAgICAgICBzbGlkZXNUb1Nob3c6IDMsXG4gICAgICAgICAgICBzbGlkZXNUb1Njcm9sbDogMyxcbiAgICAgICAgICAgIHJlc3BvbnNpdmU6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrcG9pbnQ6IDY2NyxcbiAgICAgICAgICAgICAgICAgICAgc2V0dGluZ3M6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNsaWRlc1RvU2hvdzogMSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHNsaWRlc1RvU2Nyb2xsOiAxXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdXG4gICAgICAgIH0pO1xuXG4gICAgICAgICQoJyNjbGllbnRzLXNsaWRlLWxpc3QnKS5zbGljayh7XG4gICAgICAgICAgICBkb3RzOiBmYWxzZSxcbiAgICAgICAgICAgIGFycm93czogZmFsc2UsXG4gICAgICAgICAgICBzcGVlZDogMzAwLFxuICAgICAgICAgICAgc2xpZGVzVG9TaG93OiA0LFxuICAgICAgICAgICAgc2xpZGVzVG9TY3JvbGw6IDQsXG4gICAgICAgICAgICByZXNwb25zaXZlOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBicmVha3BvaW50OiA2NjcsXG4gICAgICAgICAgICAgICAgICAgIHNldHRpbmdzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjZW50ZXJNb2RlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyaWFibGVXaWR0aDogdHJ1ZVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXVxuICAgICAgICB9KTtcblxuICAgICAgICAkKCcjdGVzdGltb25pYWwtc2xpZGUtbGlzdCcpLnNsaWNrKHtcbiAgICAgICAgICAgIGRvdHM6IHRydWUsXG4gICAgICAgICAgICBhcnJvd3M6IGZhbHNlLFxuICAgICAgICAgICAgdmVydGljYWw6IHRydWUsXG4gICAgICAgICAgICBlYXNpbmc6ICdsaW5lYXInLFxuICAgICAgICAgICAgLy8gaW5maW5pdGU6IGZhbHNlLFxuICAgICAgICAgICAgc3BlZWQ6IDMwMCxcbiAgICAgICAgICAgIHNsaWRlc1RvU2hvdzogMSxcbiAgICAgICAgICAgIHNsaWRlc1RvU2Nyb2xsOiAxLFxuICAgICAgICB9KTtcbiovXG4gICAgICAgIFxuICAgICAgICAvLyBTbGlkZSBuYXYgbmV4dCBhbmQgcHJldiBlbnZlbnRcbiAgICAgICAgdmFyIGdldElkID0gZnVuY3Rpb24oZWxlbWVudCkge1xuICAgICAgICAgICAgcmV0dXJuICcjJyArICQoZWxlbWVudCkucGFyZW50KCkucHJldigpLmF0dHIoJ2lkJyk7XG4gICAgICAgIH07XG4gICAgICAgICQoJy5jdXN0b20tbmF2LWxlZnQnKS5jbGljayhmdW5jdGlvbihldmVudCkge1xuICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICQoZ2V0SWQodGhpcykpLnNsaWNrKCdzbGlja1ByZXYnKTtcbiAgICAgICAgfSk7XG4gICAgICAgICQoJy5jdXN0b20tbmF2LXJpZ2h0JykuY2xpY2soZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAkKGdldElkKHRoaXMpKS5zbGljaygnc2xpY2tOZXh0Jyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFNsaWRlIHNob3cgbmV4dCBhbmQgcHJldlxuICAgICAgICAvLyAkKCcuYmwtYXJ0aWNsZSwgI3NsaWRlLWJhbm5lcicpLmhvdmVyKGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyAgICAgdmFyICRsaVRvdGFsID0gJCh0aGlzKS5maW5kKCdsaS5zbGljay1zbGlkZScpLmxlbmd0aDtcbiAgICAgICAgLy8gICAgIHZhciAkbGlBY3RpdmUgPSAkKHRoaXMpLmZpbmQoJ2xpLnNsaWNrLWFjdGl2ZScpLmxlbmd0aDtcbiAgICAgICAgLy8gICAgIGNvbnNvbGUubG9nKCRsaVRvdGFsKTtcbiAgICAgICAgLy8gICAgIGNvbnNvbGUubG9nKCRsaUFjdGl2ZSk7XG4gICAgICAgICAgICBcbiAgICAgICAgLy8gICAgIGlmICggJGxpVG90YWwgPiAkbGlBY3RpdmUgKSB7XG4gICAgICAgIC8vICAgICAgICAgJCh0aGlzKS5jaGlsZHJlbignLmN1c3RvbS1uYXYtd3JhcHBlcicpLmFuaW1hdGUoe1xuICAgICAgICAvLyAgICAgICAgICAgICBvcGFjaXR5OiAnc2hvdydcbiAgICAgICAgLy8gICAgICAgICB9LCAnc2xvdycpO1xuICAgICAgICAvLyAgICAgfTtcbiAgICAgICAgLy8gfSwgZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vICAgICAkKHRoaXMpLmNoaWxkcmVuKCcuY3VzdG9tLW5hdi13cmFwcGVyJykuYW5pbWF0ZSh7XG4gICAgICAgIC8vICAgICAgICAgb3BhY2l0eTogJ2hpZGUnXG4gICAgICAgIC8vICAgICB9LCAnZmFzdCcpO1xuICAgICAgICAvLyB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIHZhciBiYW5uZXIgPSAkKFwiLmJhbm5lci1ibG9ja1wiKTtcbiAgICAgICAgLy8gdmFyICRsaVRvdGFsID0gYmFubmVyLmZpbmQoJ2xpLnNsaWNrLXNsaWRlJykubGVuZ3RoO1xuICAgICAgICAvLyB2YXIgJGxpQWN0aXZlID0gYmFubmVyLmZpbmQoJ2xpLnNsaWNrLWFjdGl2ZScpLmxlbmd0aDtcbiAgICAgICAgLy8gaWYoICRsaVRvdGFsIDw9ICRsaUFjdGl2ZSApIGJhbm5lci5maW5kKCcuY3VzdG9tLW5hdi13cmFwcGVyJykuaGlkZSgpO1xuXG4gICAgICAgICQoJy5ibC1hcnRpY2xlLCAuYmFubmVyLWJsb2NrJykub24oXCJtb3VzZWVudGVyIG1vdXNlbGVhdmUgdG91Y2hzdGFydFwiLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKHRoaXMpO1xuICAgICAgICAgICAgdmFyICRsaVRvdGFsID0gJCh0aGlzKS5maW5kKCdsaS5zbGljay1zbGlkZScpLmxlbmd0aDtcbiAgICAgICAgICAgIHZhciAkbGlBY3RpdmUgPSAkKHRoaXMpLmZpbmQoJ2xpLnNsaWNrLWFjdGl2ZScpLmxlbmd0aDtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCRsaVRvdGFsKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCRsaUFjdGl2ZSk7XG4gICAgICAgICAgICAvLyBpZiggJGxpVG90YWwgPD0gJGxpQWN0aXZlICkgJChcIi5iYW5uZXItYmxvY2tcIikuaGlkZSgpO1xuICAgICAgICAgICAgaWYgKCAkbGlUb3RhbCA+ICRsaUFjdGl2ZSAmJiAkKHRoaXMpLmhhc0NsYXNzKCdibC1hcnRpY2xlJykpICQodGhpcykuZmluZCgnLmN1c3RvbS1uYXYtd3JhcHBlcicpLmZhZGVUb2dnbGUoXCJzbG93XCIpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTY3JvbGwgVG9wXG4gICAgICAgICQoJyNzY3JvbGwtdG9wLWJ0bicpLmNsaWNrKGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgYWxlcnQoIFwiSGFuZGxlciBmb3IgLmNsaWNrKCkgY2FsbGVkLlwiICk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygndG9wJyk7XG4gICAgICAgICAgICAvLyB2YXIgdGFyZ2V0ID0gJCh0aGlzLmhyZWYpO1xuICAgICAgICAgICAgLy8gY29uc29sZS5sb2codGFyZ2V0KTtcbiAgICAgICAgICAgIC8vIGlmKCB0YXJnZXQubGVuZ3RoICkge1xuICAgICAgICAgICAgLy8gICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAvLyAgICAgJCgnaHRtbCwgYm9keScpLmFuaW1hdGUoe1xuICAgICAgICAgICAgLy8gICAgICAgICBzY3JvbGxUb3A6IHRhcmdldC5vZmZzZXQoKS50b3BcbiAgICAgICAgICAgIC8vICAgICB9LCA5MDAwKTtcbiAgICAgICAgICAgIC8vIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gTGlnaHRib3hcblxuICAgICAgICBsaWdodGJveC5vcHRpb24oe1xuICAgICAgICAgICAgJ2Fsd2F5c1Nob3dOYXZPblRvdWNoRGV2aWNlcyc6IHRydWUsXG4gICAgICAgICAgICAnYWxidW1MYWJlbCc6IFwiUXVlbSBTb21vcyAtIEdhbGVyaWEgZGUgSW1hZ2Vuc1wiLFxuICAgICAgICAgICAgJ2Rpc2FibGVTY3JvbGxpbmcnOiB0cnVlLFxuICAgICAgICAgICAgJ3Bvc2l0aW9uRnJvbVRvcCc6IDgwXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIHZhciAkbWVzc2FnZXMgPSAkKCcjZXJyb3ItbWVzc2FnZS13cmFwcGVycycpO1xuXG4gICAgICAgICQudmFsaWRhdGUoe1xuICAgICAgICAgICAgZm9ybSA6ICcjY29udGFjdC1mb3JtJyxcbiAgICAgICAgICAgIG1vZHVsZXMgOiAnYnJhemlsJyxcbiAgICAgICAgICAgIGJvcmRlckNvbG9yT25FcnJvciA6ICcjQzYwMDAwJyxcbiAgICAgICAgICAgIHNjcm9sbFRvVG9wT25FcnJvcjogJ2ZhbHNlJyxcbiAgICAgICAgICAgIGlucHV0UGFyZW50Q2xhc3NPblN1Y2Nlc3M6ICdmYWxzZScsXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIG9uRWxlbWVudFZhbGlkYXRlIDogZnVuY3Rpb24odmFsaWQsICRlbCwgJGZvcm0sIGVycm9yTWVzcykge1xuICAgICAgICAgICAgICAgIGlmKCF2YWxpZCkge1xuICAgICAgICAgICAgICAgICAgICAkKCRlbC5jb250ZXh0KS5wcmV2KCkucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgICAgICQoJGVsLmNvbnRleHQpLmFmdGVyKCc8c3BhbiBjbGFzcz1cImhlbHAtYmxvY2sgZm9ybS1lcnJvclwiPicrIGVycm9yTWVzcyArJzwvc3Bhbj4nKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBvblN1Y2Nlc3MgOiBmdW5jdGlvbigkZm9ybSkge1xuXG4gICAgICAgICAgICAgICAgdmFyIGZvcm1NZXNzYWdlcyA9ICQoJyNlbWFpbC1tZXNzYWdlJyksXG4gICAgICAgICAgICAgICAgICAgIGZvcm0gPSAkZm9ybSxcbiAgICAgICAgICAgICAgICAgICAgZm9ybURhdGEgPSAkKGZvcm0pLnNlcmlhbGl6ZSgpO1xuICAgICAgICAgICAgICAgICQuYWpheCh7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdQT1NUJyxcbiAgICAgICAgICAgICAgICAgICAgdXJsOiAnLy9mb3Jtc3ByZWUuaW8vYnJhbmRlbC5yakBnbWFpbC5jb20nLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiBmb3JtRGF0YSxcbiAgICAgICAgICAgICAgICAgICAgZGF0YVR5cGU6IFwianNvblwiXG4gICAgICAgICAgICAgICAgfSkuZG9uZShmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhcImRvbmVcIik7XG4gICAgICAgICAgICAgICAgICAgIC8vIE1ha2Ugc3VyZSB0aGF0IHRoZSBmb3JtTWVzc2FnZXMgZGl2IGhhcyB0aGUgJ3N1Y2Nlc3MnIGNsYXNzLlxuICAgICAgICAgICAgICAgICAgICBmb3JtTWVzc2FnZXMucmVtb3ZlQ2xhc3MoJ2Zvcm0tZXJyb3InKTtcbiAgICAgICAgICAgICAgICAgICAgZm9ybU1lc3NhZ2VzLmFkZENsYXNzKCdmb3JtLXN1Y2Nlc3MnKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gU2V0IHRoZSBtZXNzYWdlIHRleHQuXG4gICAgICAgICAgICAgICAgICAgIGZvcm1NZXNzYWdlcy50ZXh0KCdGb3JtdWzDoXJpbyBlbnZpYWRvIGNvbSBzdWNlc3NvJykuZmFkZUluKFwic2xvd1wiKS5mYWRlT3V0KDYwMDApO1xuICAgICAgICAgICAgICAgICAgICAvLyBDbGVhciB0aGUgZm9ybS5cbiAgICAgICAgICAgICAgICAgICAgJCgnI2Zvcm0tbmFtZScpLnZhbCgnJyk7XG4gICAgICAgICAgICAgICAgICAgICQoJyNmb3JtLWVtYWlsJykudmFsKCcnKTtcbiAgICAgICAgICAgICAgICAgICAgJCgnI2Zvcm0tdGVsJykudmFsKCcnKTtcbiAgICAgICAgICAgICAgICAgICAgJCgnI2Zvcm0tbXNnJykudmFsKCcnKTtcbiAgICAgICAgICAgICAgICB9KS5mYWlsKGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coXCJmYWlsXCIpO1xuICAgICAgICAgICAgICAgICAgICBmb3JtTWVzc2FnZXMucmVtb3ZlQ2xhc3MoJ2Zvcm0tc3VjY2VzcycpO1xuICAgICAgICAgICAgICAgICAgICBmb3JtTWVzc2FnZXMuYWRkQ2xhc3MoJ2Zvcm0tZXJyb3InKTtcbiAgICAgICAgICAgICAgICAgICAgZm9ybU1lc3NhZ2VzLnRleHQoJ09jb3JyZXUgdW0gZXJybywgdGVudGUgbm92YW1lbnRlLicpLmZhZGVJbihcInNsb3dcIikuZmFkZU91dCg2MDAwKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFJlc3RyaWN0IHByZXNlbnRhdGlvbiBsZW5ndGhcblxuICAgICAgICAkKCcjZm9ybS1tc2cnKS5yZXN0cmljdExlbmd0aCggJCgnI21heGxlbmd0aCcpICk7XG5cbiAgICAgICAgLy8gdXNpbmcgalF1ZXJ5IE1hc2sgUGx1Z2luIHYxLjcuNVxuICAgICAgICAvLyBodHRwOi8vanNmaWRkbGUubmV0L2QyOW02ZW54LzIvXG5cbiAgICAgICAgdmFyIG1hc2tCZWhhdmlvciA9IGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgICAgIHJldHVybiB2YWwucmVwbGFjZSgvXFxEL2csICcnKS5sZW5ndGggPT09IDExID8gJygwMCkgMDAwMDAtMDAwMCcgOiAnKDAwKSAwMDAwLTAwMDA5JztcbiAgICAgICAgfSxcbiAgICAgICAgb3B0aW9ucyA9IHtvbktleVByZXNzOiBmdW5jdGlvbih2YWwsIGUsIGZpZWxkLCBvcHRpb25zKSB7XG4gICAgICAgICAgICBmaWVsZC5tYXNrKG1hc2tCZWhhdmlvci5hcHBseSh7fSwgYXJndW1lbnRzKSwgb3B0aW9ucyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgICQoJyNmb3JtLXRlbCcpLm1hc2sobWFza0JlaGF2aW9yLCBvcHRpb25zKTtcblxuICAgICAgICAvLyBHb29nbGUgTWFwc1xuICAgICAgICBcbiAgICAgICAgJC5mbi5nTWFwcyA9IGZ1bmN0aW9uKCBvcHRpb25zICkge1xuICAgICAgICBcbiAgICAgICAgICAgIHZhciBzZXR0aW5ncyA9ICQuZXh0ZW5kKHtcbiAgICAgICAgICAgICAgICBhZGRyZXNzOiBcIlJ1YSBTZW5hZG9yIFNvdXphIE5hdmVzLCA3NzEsIExvbmRyaW5hLCBQUlwiLFxuICAgICAgICAgICAgICAgIHpvb206IDE0LFxuICAgICAgICAgICAgICAgIHBpbjogXCJpbWFnZXMvbWFwLXBpbi5wbmdcIixcbiAgICAgICAgICAgICAgICBpbmZvOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBzY3JvbGw6IGZhbHNlXG4gICAgICAgICAgICB9LCBvcHRpb25zICk7XG5cbiAgICAgICAgICAgIHZhciAkZWwgPSAkKHRoaXMpWzBdO1xuXG4gICAgICAgICAgICBtYXBBZGRyZXNzKCRlbCwgc2V0dGluZ3MpO1xuXG4gICAgICAgICAgICByZXR1cm4gdGhpc1xuICAgICAgICBcbiAgICAgICAgfTtcblxuICAgICAgICBmdW5jdGlvbiBtYXBBZGRyZXNzKG1hcEVsZW1lbnQsIHNldHRpbmdzKSB7XG4gICAgICAgICAgICB2YXIgZ2VvY29kZXIgPSBuZXcgZ29vZ2xlLm1hcHMuR2VvY29kZXIoKTtcblxuICAgICAgICAgICAgZ2VvY29kZXIuZ2VvY29kZSh7ICdhZGRyZXNzJzogc2V0dGluZ3MuYWRkcmVzcyB9LCBmdW5jdGlvbiAocmVzdWx0cywgc3RhdHVzKSB7XG4gICAgICAgICAgICAgICAgaWYgKHN0YXR1cyA9PSBnb29nbGUubWFwcy5HZW9jb2RlclN0YXR1cy5PSykge1xuICAgICAgICAgICAgICAgICAgICB2YXIgbWFwT3B0aW9ucyA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHpvb206IHNldHRpbmdzLnpvb20sXG4gICAgICAgICAgICAgICAgICAgICAgICBjZW50ZXI6IHJlc3VsdHNbMF0uZ2VvbWV0cnkubG9jYXRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICBzY3JvbGx3aGVlbDogc2V0dGluZ3Muc2Nyb2xsID8gdHJ1ZSA6IGZhbHNlXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIHZhciBtYXAgPSBuZXcgZ29vZ2xlLm1hcHMuTWFwKG1hcEVsZW1lbnQsIG1hcE9wdGlvbnMpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgbWFya2VyID0gbmV3IGdvb2dsZS5tYXBzLk1hcmtlcih7XG4gICAgICAgICAgICAgICAgICAgICAgICBtYXA6IG1hcCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiByZXN1bHRzWzBdLmdlb21ldHJ5LmxvY2F0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgaWNvbjogc2V0dGluZ3MucGluXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmKHNldHRpbmdzLmluZm8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBjb250ZW50U3RyaW5nID0gJzxkaXYgY2xhc3M9XCJtYXAtbWFya2VyXCI+Q29uc3VsdMOzcmlvIFJpY2FyZG8gQnJhbmTDo286ICcgKyBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJzxzcGFuPlJ1YSBTZW5hZG9yIFNvdXphIE5hdmVzLCA3NzEsIFNhbGEgMzA1IC0gTG9uZHJpbmEtUFI8L3NwYW4+PC9kaXY+JztcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBpbmZvd2luZG93ID0gbmV3IGdvb2dsZS5tYXBzLkluZm9XaW5kb3coe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRlbnQ6IGNvbnRlbnRTdHJpbmdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgaW5mb3dpbmRvdy5vcGVuKG1hcCwgbWFya2VyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1hcmtlci5hZGRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbmZvd2luZG93Lm9wZW4obWFwLCBtYXJrZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJHZW9jb2RlIHdhcyBub3Qgc3VjY2Vzc2Z1bCBmb3IgdGhlIGZvbGxvd2luZyByZWFzb246IFwiICsgc3RhdHVzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgICQoXCIjZ21hcC1zZFwiKS5nTWFwcygpO1xuICAgICAgICAkKFwiI2dtYXAtbGNcIikuZ01hcHMoeyB6b29tOiAxNiwgcGluOiBcImltYWdlcy9tYXAtcGluLWJpZy5wbmdcIiwgaW5mbzogdHJ1ZSB9KTtcblxuICAgIH0pKGpRdWVyeSk7XG59KTsiXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
