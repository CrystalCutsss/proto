// #/ — approved credit offer: amount slider, terms and pledge cards. Reaching 7 000 000 ₽ switches the
// pledge on; tapping a card switches it and moves the slider (animated) by the pledge amount.
import { duration, ease, gsap } from '@proto/motion';
import {
  AMOUNT,
  clampAmount,
  formatRub,
  monthlyPayment,
  PLEDGE_BONUS,
  pledgeOnAt,
  sliderAfterPledgeTap,
} from '../calc';
import {
  badge,
  badges,
  bottomBlock,
  cardLarge,
  feeHtml,
  infoCard,
  onActivate,
  primaryButton,
  setCardChecked,
  topBars,
} from '../components';
import { config } from '../config';
import { icon } from '../icons';
import { choice, type Pledge, pledgeCards, state } from '../state';
import type { Screen } from './types';

const PLEDGES: Record<Pledge, { title: string; text: string; description: string }> = {
  auto: { title: 'Под залог авто', text: 'Под залог авто', description: 'Mercedes-Benz W214' },
  realty: {
    title: 'Под залог недвижимости',
    text: 'Под залог недвижимости',
    description: 'Москва, ул.&nbsp;Лесная, 27, кв.&nbsp;263',
  },
};

const pledgeBadges = () => badges(badge('rub', `+${formatRub(PLEDGE_BONUS)}`), badge('percent', '−0,5%'));

function pledgeCard(pledge: Pledge, role: 'checkbox' | 'radio'): string {
  const p = PLEDGES[pledge];
  return cardLarge({
    id: `pledge-${pledge}`,
    choice: pledge,
    title: p.title,
    titleText: p.text,
    description: p.description,
    role,
    checked: state.pledge === pledge,
    body: pledgeBadges(),
  });
}

function pledgeCardsHtml(): string {
  const cards = pledgeCards();
  if (cards.length === 1) return `<div class="card-list">${pledgeCard(cards[0]!, 'checkbox')}</div>`;
  return `<div class="card-list" role="radiogroup" aria-label="Залог">${cards.map((p) => pledgeCard(p, 'radio')).join('')}</div>`;
}

const ticks = Array.from(
  { length: 5 },
  () => `<img src="${icon('slider-tick.svg')}" alt="" width="4" height="4" />`,
).join('');

/** Slider fill, amount text and its accessible value for a (possibly in-between) slider value. */
function drawSlider(root: HTMLElement, value: number): void {
  const slider = root.querySelector<HTMLInputElement>('.slider__input')!;
  const text = formatRub(clampAmount(value));
  root.querySelector('[data-amount]')!.textContent = text;
  const progress = (value - AMOUNT.min) / (AMOUNT.max - AMOUNT.min);
  slider.parentElement!.style.setProperty('--progress', String(progress));
  slider.setAttribute('aria-valuetext', text);
}

/** Everything that depends on the state; `withSlider: false` leaves a running slider animation alone. */
function render(root: HTMLElement, withSlider = true): void {
  if (withSlider) {
    root.querySelector<HTMLInputElement>('.slider__input')!.value = String(state.slider);
    drawSlider(root, state.slider);
  }
  root.querySelectorAll<HTMLElement>('.card-large__control').forEach((control) => {
    setCardChecked(control, control.dataset.choice === state.pledge);
  });
  const c = choice();
  const payment = root.querySelector('[data-value="payment"]');
  if (payment) payment.textContent = formatRub(monthlyPayment(c));
  const fee = root.querySelector('[data-value="fee"]');
  if (fee) fee.innerHTML = feeHtml(c);
}

const infoCards = () =>
  config.product === 'kn'
    ? `${infoCard('Срок', '5 лет', { chevron: true })}
       ${infoCard('Платеж в месяц', '', { chevron: true, key: 'payment' })}`
    : `${infoCard('Срок', '5 лет', { chevron: true })}
       ${infoCard('Комиссия', '', { key: 'fee' })}
       ${infoCard('Платеж в месяц', '', { chevron: true, wide: true, key: 'payment' })}`;

export const offer: Screen = {
  route: '#/',
  label: 'Одобрили кредит',
  canGoBack: false,
  html: () => `
    ${topBars('close', null)}
    <div class="content">
      <h1 class="offer__title t-heading-s">Одобрили кредит<br />ИП Константинопольский К.&nbsp;К.</h1>
      <p class="offer__amount t-number-2xl" data-amount aria-hidden="true">${formatRub(state.slider)}</p>
      <div class="slider">
        <div class="slider__track" aria-hidden="true"></div>
        <div class="slider__ticks" aria-hidden="true">${ticks}</div>
        <input class="slider__input" type="range" min="${AMOUNT.min}" max="${AMOUNT.max}"
          step="${AMOUNT.step}" value="${state.slider}" aria-label="Сумма кредита" />
      </div>
      <div class="slider__labels t-body-m text-secondary" aria-hidden="true">
        <span>${formatRub(AMOUNT.min)}</span><span>${formatRub(AMOUNT.max)}</span>
      </div>
      <div class="info-cards">${infoCards()}</div>
      ${pledgeCardsHtml()}
    </div>
    ${bottomBlock({ button: primaryButton('Дальше', 'next') })}`,

  next: () => '#/options',

  refresh: (root) => render(root),

  mount(root) {
    const slider = root.querySelector<HTMLInputElement>('.slider__input')!;
    const first = pledgeCards()[0]!;
    let tween: gsap.core.Tween | null = null;

    const stopTween = () => {
      tween?.kill();
      tween = null;
      slider.step = String(AMOUNT.step);
    };

    slider.addEventListener('input', () => {
      stopTween();
      state.slider = Number(slider.value);
      const on = pledgeOnAt(state.slider);
      if (on && state.pledge === null) state.pledge = first;
      if (!on) state.pledge = null;
      render(root);
    });

    /** Move the slider to `target` with the amount counting along (fast, productive). */
    const animateTo = (target: number) => {
      stopTween();
      const proxy = { v: Number(slider.value) }; // from where the thumb is (an earlier move may run)
      state.slider = target;
      slider.step = 'any'; // continuous thumb while it moves
      tween = gsap.to(proxy, {
        v: target,
        duration: duration.fast,
        ease: ease.productive,
        onUpdate: () => {
          slider.value = String(proxy.v);
          drawSlider(root, proxy.v);
        },
        onComplete: () => {
          stopTween();
          render(root);
        },
      });
    };

    const tap = (pledge: Pledge) => {
      if (state.pledge === pledge) {
        state.pledge = null;
        animateTo(sliderAfterPledgeTap(state.slider, false));
      } else if (state.pledge === null) {
        state.pledge = pledge;
        animateTo(sliderAfterPledgeTap(state.slider, true));
      } else {
        state.pledge = pledge; // two pledges: the selection moves, the amount stays
      }
      render(root, false);
    };

    const controls = [...root.querySelectorAll<HTMLElement>('.card-large__control')];
    controls.forEach((control, i) => {
      onActivate(control, () => tap(control.dataset.choice as Pledge));
      if (controls.length < 2) return;
      control.addEventListener('keydown', (event) => {
        const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key];
        if (!step) return;
        event.preventDefault();
        controls[(i + step + controls.length) % controls.length]!.focus();
      });
    });

    render(root);
  },
};
