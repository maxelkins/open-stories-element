const s = 5
const style = `
  :host {
    display: inline-block;
  }

  :focus {
    outline: none;
  }

  :focus-visible {
    outline: default;
  }

  ::backdrop {
    background-color: #343434;
  }

  button {
    border: 0;
    background: 0;
    appearance: none;
    cursor: pointer;
  }

  .ring {
    border-radius: 50%;
    aspect-ratio: 1;
    width: 50px;
    border: 2px solid #08c;
    padding: 2px;
    overflow: hidden;
  }

  .avatar {
    width: 100%;
    aspect-ratio: 1;
    border-radius: 50%;
  }

  dialog {
    height: 100vh;
    padding: 0;
    border: 0;
    aspect-ratio: 9/16;
    background: transparent;
    overflow: visible;
  }
  
  #images {
    overflow: hidden;
    height: 100%;
    width: 100%;
    position: absolute;
    border-radius: 10px;
  }

  dialog img {
    position: absolute;
    max-height: 100%;
    aspect-ratio: 9/16;
    top: 0;
    opacity: 0;
  }

  dialog img.shown {
    opacity: 1;
  }

  .bar {
    border-radius: 3px;
    overflow: hidden;
    height: 100%;
    background: rgba(255, 255, 255, .2);
    z-index: 1;
    flex: auto;
  }

  #bars {
    left: 0; 
    right: 0;
    top: 0;
    height: 2px;
    position: absolute;
    margin: 10px;
    display: flex;
    gap: 5px;
  }

  .progress {
    height: 100%;
    animation: none;
    background-color: #fff;
  }
  
  .progressing ~ .bar .progress {
    background-color: transparent;
    width: auto;
  }

  .progressing.paused .progress {
    animation-play-state: paused;
  }

  .progressing .progress {
    width: 0;
    animation: progress ${s}s linear;
    animation-play-state: running;
  }

  @keyframes progress {
    0% { width: 0%; }
    100% { width: 100%; }
  }

  #back, #forward {
    position: absolute;
    height: 100%;
    z-index: 1;
    width: 40px;
    font-size: 20px;
    font-family: system-ui, sans-serif;
  }

  #back {
    left: -40px;
    text-align: left;
  }

  #forward {
    right: -40px;
    text-align: right;
  }

`

class StoryViewElement extends HTMLElement {
  constructor() {
    super()
  }

  connectedCallback() {
    this.root = this.attachShadow({mode: 'open'})
    this.root.innerHTML = `
      <style>${style}</style>
      <button type="dialog"><slot></slot></button>
      <dialog>
        <div id="bars"></div>
        <button id="back" class="paginate">←</button>
        <button id="forward" class="paginate">→</button>
        <div id="images"></div>
      </dialog>
    `

    this.dialog = this.root.querySelector('dialog')

    this.bindEvents()
    if (this.hasAttribute('src')) {
      this.fetchData(this.getAttribute('src'))
    }
  }

  bindEvents() {
    const button = this.root.querySelector('button')
    const images = this.root.querySelector('#images')
    const back = this.root.querySelector('#back')
    const forward = this.root.querySelector('#forward')
    this._rotate = this.rotate.bind(this, 1)

    button.addEventListener('click', () => {
      this.dialog.open ? this.dialog.close() : this.dialog.showModal()
      if (this.dialog.open) this.startTimer()
    })

    back.addEventListener('click', () => {
      if (this.currentIndex === 0) {
        this.dialog.close()
      } else {
        this.rotate(-1)
      }
    })

    forward.addEventListener('click', () => {
      if (this.currentIndex === this.images.length - 1) {
        this.dialog.close()
      } else {
        this.rotate(1)
      }
    })

    this.dialog.addEventListener('close', () => {
      if (this.timer) clearTimeout(this.timer)
      this.currentIndex = 0
    })

    images.addEventListener('mousedown', () => {
      this.currentBar.classList.add('paused')
      clearTimeout(this.timer)
    })

    images.addEventListener('mouseup', () => {
      this.currentBar.classList.remove('paused')
      this.currentBar.querySelector('.progress').addEventListener('animationend', this._rotate, {once: true})
    })
  }

  async fetchData(url) {
    const json = await (await fetch(url)).json()
    this.root.querySelector('slot').innerHTML = `
      <div class="ring"><img src="${json.icon}" alt="${json.title}" class="avatar"></div>
    `
    this.appendImages(json.items)
  }

  appendImages(items) {
    this.count = items.length
    this.images = []
    this.bars = []
    const bars = this.root.querySelector('#bars')
    const images = this.root.querySelector('#images')
    for (const item of items) {
      const bar = document.createElement('div')
      bar.classList.add('bar')
      const progress = document.createElement('div')
      progress.classList.add('progress')
      bar.append(progress)
      bars.append(bar)
      this.bars.push(bar)
      const img = document.createElement('img')
      img.src = item.image
      img.alt = item.summray
      images.append(img)
      this.images.push(img)
    }
  }
  
  startTimer() {
    this.currentIndex ||= -1
    this.rotate()
  }
  
  rotate(delta) {
    delta ||= 1
    // Reset animation
    if (this.currentBar) {
      this.currentBar.style.animation = 'none'
      this.currentBar.offsetHeight
      this.currentBar.style.animation = null
      this.currentBar.classList.remove('progressing')
    } 
    clearTimeout(this.timer)
    if (this.currentImage) this.currentImage.classList.remove('shown')

    this.currentIndex += delta

    if (this.currentIndex === this.images.length) {
      this.dialog.close()
      return
    }

    this.currentBar = this.bars[this.currentIndex]
    this.currentImage = this.images[this.currentIndex]
    this.currentBar.classList.add('progressing')
    this.currentImage.classList.add('shown')
    if (this.currentIndex > this.images.length - 1) this.currentIndex = 0

    this.timer = setTimeout(this.rotate.bind(this), s * 1000)
  }
}

window.StoryViewElement = StoryViewElement
window.customElements.define('story-view', StoryViewElement)
