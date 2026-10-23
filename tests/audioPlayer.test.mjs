import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { transformWithOxc } from 'vite';
import { copy, languages } from '../src/i18n.js';

const source = (await fs.readFile(new URL('../src/components/AudioPlayer.jsx', import.meta.url), 'utf8'))
  .replace(/^import .*;\r?\n/gm, '').replace('export default function AudioPlayer', 'function AudioPlayer');
const compiled = await transformWithOxc(source + '\nglobalThis.Player = AudioPlayer;', 'AudioPlayer.jsx', { jsx: { runtime: 'classic' } });

function speechMock() {
  return {
    paused: false, spoken: [], cancels: 0, resumes: 0,
    cancel() {
      this.cancels++;
      // The browser may preserve its paused state after cancel().
      this.active?.onerror?.(); this.active = null;
    },
    pause() { this.paused = true; },
    resume() { this.paused = false; this.resumes++; },
    getVoices() { return [{ lang: 'pt-BR' }, { lang: 'en-US' }, { lang: 'es-ES' }]; },
    speak(utterance) { this.spoken.push(utterance); this.active = utterance; if (!this.paused) utterance.onstart?.(); },
  };
}

function mount(synth = speechMock(), supported = true) {
  const hooks = []; let cursor = 0, dirty = false, tree, props;
  let effects = [];
  class Utterance { constructor(text) { this.text = text; } }
  const context = {
    copy, languages, SpeechSynthesisUtterance: Utterance,
    window: supported ? { speechSynthesis: synth, SpeechSynthesisUtterance: Utterance } : {},
    React: { createElement: (type, props, ...children) => ({ type, props: { ...props, children } }) },
    useState(initial) {
      const index = cursor++;
      hooks[index] ??= { value: initial };
      return [hooks[index].value, (value) => { if (hooks[index].value !== value) { hooks[index].value = value; dirty = true; } }];
    },
    useRef(value) { const index = cursor++; hooks[index] ??= { current: value }; return hooks[index]; },
    useEffect(effect, dependencies) {
      const index = cursor++, previous = hooks[index];
      if (!previous || dependencies.some((value, i) => value !== previous.dependencies[i])) effects.push(() => {
        previous?.cleanup?.(); hooks[index] = { dependencies, cleanup: effect() };
      });
    },
  };
  vm.createContext(context); vm.runInContext(compiled.code, context);
  const player = {
    synth,
    render(next = props) {
      props = next;
      do {
        dirty = false; cursor = 0; effects = [];
        tree = context.Player(props);
        for (const effect of effects) effect();
      } while (dirty);
      return tree;
    },
    click() { tree.props.children[0].props.onClick(); player.render(); },
    button() { return tree.props.children[0].props; },
    status() { return hooks[0].value; },
    unmount() { for (const hook of hooks) hook.cleanup?.(); },
  };
  return player;
}

test('pause, change specimen language, and play starts a fresh utterance at the beginning', () => {
  const player = mount();
  player.render({ text: 'Descrição em português', language: 'pt' });
  player.click(); player.click();
  const previous = player.synth.spoken[0];
  assert.equal(player.status(), 'paused');
  assert.equal(player.synth.paused, true);

  player.render({ text: 'English description', language: 'en' });
  assert.equal(player.status(), 'idle');
  assert.equal(player.button()['aria-label'], copy.en.specimen.play);
  player.click();
  assert.equal(player.synth.spoken.length, 2);
  assert.notEqual(player.synth.spoken[1], previous);
  assert.equal(player.synth.spoken[1].text, 'English description');
  assert.equal(player.synth.spoken[1].lang, 'en-US');
  assert.equal(player.synth.spoken[1].voice.lang, 'en-US');
  assert.equal(player.synth.paused, false);
  assert.equal(player.status(), 'speaking');

  // Events from the canceled language must not change the new player.
  previous.onend(); previous.onerror(); player.render();
  assert.equal(player.status(), 'speaking');
});

test('repeated language switches reset even when narration text is identical', () => {
  const player = mount();
  for (const language of ['pt', 'en', 'es', 'pt']) {
    player.render({ text: 'Morrinhosuchus luziae', language });
    assert.equal(player.status(), 'idle');
    player.click();
    assert.equal(player.synth.spoken.at(-1).lang, languages[language].locale);
    assert.equal(player.synth.paused, false);
    player.click();
    assert.equal(player.status(), 'paused');
  }
  assert.equal(player.synth.spoken.length, 4);
});

test('changing language during speech or after an error also allows playback from the start', () => {
  const player = mount();
  player.render({ text: 'Português', language: 'pt' }); player.click();
  player.render({ text: 'Español', language: 'es' });
  assert.equal(player.status(), 'idle'); player.click();
  player.synth.spoken.at(-1).onerror(); player.render();
  assert.equal(player.status(), 'error');
  player.render({ text: 'English', language: 'en' });
  assert.equal(player.status(), 'idle'); player.click();
  assert.equal(player.status(), 'speaking');
});

test('pause and continue in the same language resume the existing utterance', () => {
  const player = mount();
  player.render({ text: 'Descrição', language: 'pt' });
  player.click(); player.click(); player.click();
  assert.equal(player.synth.spoken.length, 1);
  assert.equal(player.synth.resumes, 1);
  assert.equal(player.status(), 'speaking');
});

test('unmount stops narration and a newly mounted player clears a retained browser pause', () => {
  const synth = speechMock(), first = mount(synth);
  first.render({ text: 'Descrição', language: 'pt' }); first.click(); first.click(); first.unmount();
  assert.equal(synth.active, null);
  const second = mount(synth);
  second.render({ text: 'Description', language: 'en' }); second.click();
  assert.equal(synth.paused, false);
  assert.equal(synth.spoken.at(-1).text, 'Description');
});

test('updated narration resets playback and unsupported browsers keep the control disabled', () => {
  const player = mount();
  player.render({ text: 'Texto inicial', language: 'pt' }); player.click(); player.click();
  player.render({ text: 'Texto atualizado', language: 'pt' });
  assert.equal(player.status(), 'idle'); player.click();
  assert.equal(player.synth.spoken.at(-1).text, 'Texto atualizado');
  const unavailable = mount(speechMock(), false);
  unavailable.render({ text: 'Descrição', language: 'pt' });
  assert.equal(unavailable.button().disabled, true);
});
