// e2e 테스트는 개발 서버와 같은 로컬 DB를 쓴다.
// 테스트 부팅이 진행 중인 작업을 "중단됨"으로 바꾸거나 API 키를 요구하지 않게 한다.
process.env.STALE_RECOVERY_ON_BOOT = 'false';
process.env.API_KEY = '';
