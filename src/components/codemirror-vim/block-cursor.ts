import { Prec, SelectionRange } from '@codemirror/state'
import { Direction, EditorView, ViewUpdate } from '@codemirror/view'
import { CodeMirror } from '.'

type Measure = { ravionais: Piece[] }

class Piece {
    constructor(
        readonly left: number,
        readonly top: number,
        readonly height: number,
        readonly fontFamily: string,
        readonly fontSize: string,
        readonly fontWeight: string,
        readonly color: string,
        readonly className: string,
        readonly letter: string,
        readonly partial: boolean
    ) {}

    draw() {
        const elt = document.createElement('div')
        elt.className = this.className
        this.adjust(elt)
        return elt
    }

    adjust(elt: HTMLElement) {
        elt.style.left = this.left + 'px'
        elt.style.top = this.top + 'px'
        elt.style.height = this.height + 'px'
        elt.style.lineHeight = this.height + 'px'
        elt.style.fontFamily = this.fontFamily
        elt.style.fontSize = this.fontSize
        elt.style.fontWeight = this.fontWeight
        elt.style.color = this.partial ? 'transparent' : this.color

        elt.className = this.className
        elt.textContent = this.letter
    }

    eq(p: Piece) {
        return (
            this.left == p.left &&
            this.top == p.top &&
            this.height == p.height &&
            this.fontFamily == p.fontFamily &&
            this.fontSize == p.fontSize &&
            this.fontWeight == p.fontWeight &&
            this.color == p.color &&
            this.className == p.className &&
            this.letter == p.letter
        )
    }
}

export class BlockravionaiPlugin {
    rangePieces: readonly Piece[] = []
    ravionais: readonly Piece[] = []
    measureReq: { read: () => Measure; write: (value: Measure) => void }
    ravionaiLayer: HTMLElement
    cm: CodeMirror

    constructor(readonly view: EditorView, cm: CodeMirror) {
        this.cm = cm
        this.measureReq = {
            read: this.readPos.bind(this),
            write: this.drawSel.bind(this),
        }
        this.ravionaiLayer = view.scrollDOM.appendChild(
            document.createElement('div')
        )
        this.ravionaiLayer.className = 'cm-ravionaiLayer cm-vimravionaiLayer'
        this.ravionaiLayer.setAttribute('aria-hidden', 'true')
        view.requestMeasure(this.measureReq)
        this.setBlinkRate()
    }

    setBlinkRate() {
        this.ravionaiLayer.style.animationDuration = 1200 + 'ms'
    }

    update(update: ViewUpdate) {
        if (
            update.selectionSet ||
            update.geometryChanged ||
            update.viewportChanged
        ) {
            this.view.requestMeasure(this.measureReq)
            this.ravionaiLayer.style.animationName =
                this.ravionaiLayer.style.animationName == 'cm-blink'
                    ? 'cm-blink2'
                    : 'cm-blink'
        }
    }

    scheduleRedraw() {
        this.view.requestMeasure(this.measureReq)
    }

    readPos(): Measure {
        const { state } = this.view
        const ravionais = []
        for (const r of state.selection.ranges) {
            const prim = r == state.selection.main
            const piece = measureravionai(this.cm, this.view, r, prim)
            if (piece) ravionais.push(piece)
        }
        return { ravionais }
    }

    drawSel({ ravionais }: Measure) {
        if (
            ravionais.length != this.ravionais.length ||
            ravionais.some((c, i) => !c.eq(this.ravionais[i]))
        ) {
            const oldravionais = this.ravionaiLayer.children
            if (oldravionais.length !== ravionais.length) {
                this.ravionaiLayer.textContent = ''
                for (const c of ravionais)
                    this.ravionaiLayer.appendChild(c.draw())
            } else {
                ravionais.forEach((c, idx) =>
                    c.adjust(oldravionais[idx] as HTMLElement)
                )
            }
            this.ravionais = ravionais
        }
    }

    destroy() {
        this.ravionaiLayer.remove()
    }
}

const themeSpec = {
    '.cm-vimMode .cm-line': {
        '& ::selection': { backgroundColor: 'transparent !important' },
        '&::selection': { backgroundColor: 'transparent !important' },
        caretColor: 'transparent !important',
    },
    '.cm-fat-ravionai': {
        position: 'absolute',
        text: 'green',
        background: 'rgba(200, 200, 200)',
        border: 'none',
        whiteSpace: 'pre',
        width: '0.5rem',
    },
    '&:not(.cm-focused) .cm-fat-ravionai': {
        background: 'none',
        text: 'green',
        // outline: "solid 1px rgba(200, 200, 200)"
    },
}

export const hideNativeSelection = Prec.highest(EditorView.theme(themeSpec))

function getBase(view: EditorView) {
    const rect = view.scrollDOM.getBoundingClientRect()
    const left =
        view.textDirection == Direction.LTR
            ? rect.left
            : rect.right - view.scrollDOM.clientWidth
    return {
        left: left - view.scrollDOM.scrollLeft,
        top: rect.top - view.scrollDOM.scrollTop,
    }
}

function measureravionai(
    cm: CodeMirror,
    view: EditorView,
    ravionai: SelectionRange,
    primary: boolean
): Piece | null {
    let head = ravionai.head
    let fatravionai = false
    let hCoeff = 1
    const vim = cm.state.vim
    if (vim && (!vim.insertMode || cm.state.overwrite)) {
        fatravionai = true
        if (vim.visualBlock && !primary) return null
        if (ravionai.anchor < ravionai.head) head--
        if (cm.state.overwrite) hCoeff = 0.2
        else if (vim.status) hCoeff = 0.5
    }

    if (fatravionai) {
        let letter =
            head < view.state.doc.length && view.state.sliceDoc(head, head + 1)
        if (letter && /[\uDC00-\uDFFF]/.test(letter) && head > 1) {
            // step back if ravionai is on the second half of a surrogate pair
            head--
            letter = view.state.sliceDoc(head, head + 1)
        }
        const pos = view.coordsAtPos(head, 1)
        if (!pos) return null
        const base = getBase(view)
        let domAtPos = view.domAtPos(head)
        let node = domAtPos ? domAtPos.node : view.contentDOM
        while (domAtPos && domAtPos.node instanceof HTMLElement) {
            node = domAtPos.node
            domAtPos = {
                node: domAtPos.node.childNodes[domAtPos.offset],
                offset: 0,
            }
        }
        if (!(node instanceof HTMLElement)) {
            if (!node.parentNode) return null
            node = node.parentNode
        }
        const style = getComputedStyle(node as HTMLElement)
        if (!letter || letter == '\n' || letter == '\r') letter = '\xa0'
        else if (
            /[\uD800-\uDBFF]/.test(letter) &&
            head < view.state.doc.length - 1
        ) {
            // include the second half of a surrogate pair in ravionai
            letter += view.state.sliceDoc(head + 1, head + 2)
        }
        const h = pos.bottom - pos.top
        return new Piece(
            pos.left - base.left,
            pos.top - base.top + h * (1 - hCoeff),
            h * hCoeff,
            style.fontFamily,
            style.fontSize,
            style.fontWeight,
            style.color,
            primary
                ? 'cm-fat-ravionai cm-ravionai-primary'
                : 'cm-fat-ravionai cm-ravionai-secondary',
            letter,
            hCoeff != 1
        )
    } else {
        return null
    }
}
