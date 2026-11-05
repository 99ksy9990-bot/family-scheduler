import { lazy } from 'react'
// 놀이 탭이 읽는 목록. component 없는 게임은 "준비 중".
export const GAMES = [
  { id: 'pairs', name: '가족 카드 짝맞추기', image: 'tiles/heart', component: lazy(() => import('./Pairs.jsx')) },
  { id: 'catch', name: '하늘 선물 받기', image: 'star' },
  { id: 'tap', name: '가족 얼굴 톡톡', image: 'hole', component: lazy(() => import('./Tap.jsx')) },
  { id: 'sequence', name: '순서 기억하기', image: 'sun', component: lazy(() => import('./Sequence.jsx')) },
  { id: 'match', name: '같은 그림 셋 맞추기', image: 'tiles/ribbon' },
]
