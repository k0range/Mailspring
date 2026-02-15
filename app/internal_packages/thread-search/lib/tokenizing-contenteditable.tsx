import React, { Component } from 'react';
import { TokenAndTermRegexp } from './search-bar-util';

interface TokenizingContenteditableProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void;
  onFocus: (event: React.FocusEvent<HTMLDivElement>) => void;
  onBlur: (event: React.FocusEvent<HTMLDivElement>) => void;
}

export default class TokenizingContenteditable extends Component<TokenizingContenteditableProps> {
  _textEl: HTMLDivElement;
  _tokensEl: HTMLDivElement;
  // Track IME composition state to prevent DOM updates during CJK input
  _isComposing = false;

  shouldComponentUpdate(nextProps) {
    // Prevent DOM updates during IME composition to avoid breaking CJK input
    // When composing is true, the IME needs full control over the contentEditable element
    if (this._isComposing) {
      console.log('[IME] Skipping DOM update during composition');
      return false;
    }

    if (nextProps.value !== this._textEl.innerText.replace(/\s/g, ' ')) {
      this._textEl.innerHTML = nextProps.value.replace(/\s/g, '&nbsp;');
      this._tokensEl.innerHTML = this.valueToHTML(nextProps.value);
      if (document.activeElement === this._textEl) {
        this.focus();
      }
    }
    return false;
  }

  focus = () => {
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(this._textEl);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
    this._textEl.focus();
  };

  blur = () => {
    this._textEl.blur();
  };

  insertionIndex = () => {
    const sel = document.getSelection();
    if (sel.rangeCount === 0) {
      return -1;
    }
    const range = sel.getRangeAt(0);

    if (!range) {
      return -1;
    }

    // The selection is in node units
    if (range.startContainer === this._textEl && range.endContainer === this._textEl) {
      return range.startOffset === 0 ? 0 : this._textEl.textContent.length;
    }

    // The selection is in text units
    if (this._textEl.contains(range.startContainer)) {
      return range.startOffset;
    }

    return -1;
  };

  valueToHTML = text => {
    const tokens = [];
    let m = null;
    let lastIndex = 0;

    text = text.replace(/\s/g, ' '); // with all standard space characters

    const basicSpan = document.createElement('span');
    const tokenSpan = document.createElement('span');
    tokenSpan.classList.add('layer-token');

    const regexp = TokenAndTermRegexp();
    while ((m = regexp.exec(text))) {
      const before = text.substr(lastIndex, m.index - lastIndex);
      if (before.length) {
        basicSpan.innerText = before;
        tokens.push(basicSpan.outerHTML);
      }
      lastIndex = m.index + m[1].length + m[2].length;
      tokenSpan.innerText = m[1] + m[2];
      tokens.push(tokenSpan.outerHTML);
    }
    const after = text.substr(lastIndex, text.length - lastIndex);
    if (after.length) {
      basicSpan.innerText = after;
      tokens.push(basicSpan.outerHTML);
    }
    return tokens.join('');
  };

  onPaste = e => {
    e.preventDefault();
    e.stopPropagation();
    const text = e.clipboardData
      .getData('text/plain')
      .replace(/\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    document.execCommand('insertText', false, text);

    if (document.activeElement === this._textEl) {
      const sel = window.getSelection();
      const x = (sel.getRangeAt(0).getBoundingClientRect() as DOMRect).x;
      const parent = this._textEl.parentNode as HTMLElement;
      const w = parent.getBoundingClientRect().width;
      if (x > w) {
        parent.scrollLeft += x - w;
      }
    }
  };

  onChange = e => {
    // Skip processing during IME composition to avoid interrupting CJK input
    // The browser's composition events will handle the text during composition
    if (this._isComposing) {
      console.log('[IME] Skipping onChange during composition');
      return;
    }

    const value = e.target.innerText.replace(/\s/g, ' ');
    this._tokensEl.innerHTML = this.valueToHTML(value);
    this.props.onChange(value);
  };

  // Handle IME composition start - set flag to prevent DOM updates
  onCompositionStart = (e: React.CompositionEvent<HTMLDivElement>) => {
    console.log('[IME] compositionstart:', e.data);
    this._isComposing = true;
  };

  // Handle IME composition update - track intermediate composition state
  onCompositionUpdate = (e: React.CompositionEvent<HTMLDivElement>) => {
    console.log('[IME] compositionupdate:', e.data);
  };

  // Handle IME composition end - allow DOM updates and commit final value
  onCompositionEnd = (e: React.CompositionEvent<HTMLDivElement>) => {
    console.log('[IME] compositionend:', e.data);
    this._isComposing = false;

    // After composition ends, process the final composed text
    // Use setTimeout to ensure the composition is fully committed before processing
    setTimeout(() => {
      if (this._textEl) {
        const value = this._textEl.innerText.replace(/\s/g, ' ');
        this._tokensEl.innerHTML = this.valueToHTML(value);
        this.props.onChange(value);
      }
    }, 0);
  };

  render() {
    return (
      <div className="tokenizing-contenteditable">
        <div
          contentEditable
          spellCheck={true}
          className="layer layer-text"
          ref={el => (this._textEl = el)}
          dangerouslySetInnerHTML={{ __html: this.props.value.replace(/\s/g, '&nbsp;') }}
          onKeyDown={this.props.onKeyDown}
          onPaste={this.onPaste}
          onFocus={this.props.onFocus}
          onBlur={this.props.onBlur}
          onInput={this.onChange}
          onCompositionStart={this.onCompositionStart}
          onCompositionUpdate={this.onCompositionUpdate}
          onCompositionEnd={this.onCompositionEnd}
        />
        <div
          className="layer layer-tokens"
          dangerouslySetInnerHTML={{ __html: this.valueToHTML(this.props.value) }}
          ref={el => (this._tokensEl = el)}
        />
      </div>
    );
  }
}
