import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Family Scheduler render error', error, info)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <main className="error-boundary" role="alert">
        <span>FAMILY SCHEDULER</span>
        <h1>화면을 불러오지 못했어요.</h1>
        <p>등록된 일정은 저장되어 있습니다. 앱을 다시 열어 화면만 새로 불러오세요.</p>
        <button type="button" onClick={() => window.location.reload()}>다시 불러오기</button>
      </main>
    )
  }
}
