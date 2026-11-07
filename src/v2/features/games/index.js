import { lazy } from 'react'
// 놀이 탭이 읽는 목록. component 없는 게임은 "준비 중".
// 별 쓰는 곳 (게임 목록과 따로, 놀이 탭 맨 위)
export const HOME = { id: 'home', name: '우리집 꾸미기', image: 'icons/home', component: lazy(() => import('./Home.jsx')) }
export const GAMES = [
  { id: 'pairs', name: '짝꿍 카드 찾기', image: 'icons/pairs', component: lazy(() => import('./Pairs.jsx')) },
  { id: 'catch', name: '선물 비가 내려요', image: 'icons/catch', component: lazy(() => import('./Catch.jsx')) },
  { id: 'tap', name: '두더지 가족 톡톡', image: 'icons/tap', component: lazy(() => import('./Tap.jsx')) },
  { id: 'sequence', name: '따라쟁이 챌린지', image: 'icons/sequence', component: lazy(() => import('./Sequence.jsx')) },
  { id: 'stack', name: '하늘 끝까지 집 쌓기', image: 'icons/stack', component: lazy(() => import('./Stack.jsx')) },
  { id: 'merge', name: '쑥쑥 나무 키우기', image: 'icons/merge', component: lazy(() => import('./Merge.jsx')) },
  { id: 'match', name: '달콤 3매치', image: 'icons/match', component: lazy(() => import('./Match.jsx')) },
  { id: 'clean', name: '우리집 대청소', image: 'icons/clean', component: lazy(() => import('./Clean.jsx')) },
]
