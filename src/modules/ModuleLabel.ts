import { useOnMove } from '@/events/useOnMove';
import { avg } from '@/helpers/avg';
import { neighbourGroup } from '@/helpers/neighbourGroup';
import { range } from '@/helpers/range';
import { uniq } from '@/helpers/uniq';
import { StateDto } from '@/models/State';
import { Module } from '@/modules/Module';

export class ModuleLabels extends Module {
  private labels: Map<string, Label> = new Map();
  private primaryLabels: string[] = [];

  public destroy () {
    this.labels.forEach(l => l.el.remove());
  }

  public initView () {
    const primaryLabels = getPrimaryLabels(this.config.valuesCount);

    const labelGroups = [
      primaryLabels,
      ...getAllNeighourLabels(this.config.valuesCount),
    ];

    const labels = new Map(labelGroups.flat().map(label => {
      const el = document.createElement('div');
      el.classList.add('jsr_label');
      el.dataset.key = label;
      el.style.left = '0';

      useOnMove(el, x => this.handleMove(label, x));

      return [
        label,
        { key: label, el } as Label,
      ];
    }));

    this.primaryLabels = primaryLabels;
    this.labels = labels;
    this.labels.forEach(label => this.renderer.addChild(label.el));
  }

  public render (state: StateDto): VoidFunction {
    return () => {
      this.applyValues(state);
      this.applyOverlapping();
    };
  }

  private applyValues (state: StateDto) {
    for (const [key, label] of this.labels) {
      const values = uniq(key.split('')).map(i => state.values[Number(i)]);
      const avgLeftRatio = avg(...values.map(v => v.asRatio()));

      label.el.style.left = `${avgLeftRatio * 100}%`;
      label.el.innerHTML = values.map(
        value => value.asReal().toFixed(this.config.stepDecimals),
      ).join(' - ');
    }
  }

  private applyOverlapping () {
    const verifiedLabels = verifyVisibleLabels([], this.primaryLabels, this.doLabelsOverlap.bind(this));

    [...this.labels.values()].forEach(label => {
      if (verifiedLabels.includes(label.key)) {
        label.el.classList.remove('is-hidden');
      } else {
        label.el.classList.add('is-hidden');
      }
    });
  }

  private handleMove (labelKey: string, x: number) {
    if (labelKey.length > 1) {
      return; // @TODO
    }

    this.input.setRatioValue(Number(labelKey), this.renderer.xToRelative(x));
  }

  private doLabelsOverlap (first: string, second: string): boolean {
    const firstRect = this.labels.get(first)!.el.getBoundingClientRect();
    const secondRect = this.labels.get(second)!.el.getBoundingClientRect();

    return firstRect.right > secondRect.left;
  }
}

const uniqChars = (str: string) => uniq(str.split('')).join('');

export const getPrimaryLabels = (n: number): string[] => {
  return range(n - 1).map(v => v.toString());
};

export const getAllNeighourLabels = (n: number): string[][] => {
  // [a, b, c] -> [[ab, bc], [abc]]
  const process = (arr: string[]): string[][] => {
    // [a, b, c] -> [ab, bc]
    const groups = neighbourGroup(arr).map(g => uniqChars(g.join('')));

    return [
      groups,
      ...groups.length > 1 ? process(groups) : [],
    ];
  };

  return process(getPrimaryLabels(n));
};

export const verifyVisibleLabels = (
  verifiedLabels: string[],
  labels: string[],
  doLabelsOverlap: (first: string, second: string) => boolean,
): string[] => {
  const [first, second, ...rest] = labels;

  if (!first) {
    return verifiedLabels;
  } else if (!second) {
    return [...verifiedLabels, first];
  } else {
    if (doLabelsOverlap(first, second)) {
      return verifyVisibleLabels(
        verifiedLabels,
        [uniqChars(first + second), ...rest], // labels overlap, so verify if joined label overlaps with third
        doLabelsOverlap,
      );
    } else {
      return verifyVisibleLabels(
        [...verifiedLabels, first], // first label doesn't overlap second, so it's visible
        [second, ...rest], // but second label may overlap with third, so pass it further
        doLabelsOverlap,
      );
    }
  }
};

interface Label {
  key: string;
  el: HTMLElement;
}
