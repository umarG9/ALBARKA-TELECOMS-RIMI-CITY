# ALBARKA TELECOMS RIMI CITY - REAL SERVER

Location: YAKASAI B near RIMI CITY
Phone: +234 802 657 2288
Coverage: ESTATE 300m WAN

## Yadda zaka kunna REAL server:

1. Shigar Node.js daga nodejs.org
2. Bude CMD / Terminal a folder
3. npm install
4. npm start
5. Bude http://localhost:3000

## Idan kana da MikroTik Router (Real ISP):
- Canja IP a server.js zuwa IP na MikroTik
- Saka username/password
- Server zai rika sarrafa mutane ta gaske - zai iya cire su, bada speed limit

## Idan kana da TP-Link kawai (ESTATE 300m):
- Bar MikroTik code a comment
- Server zai yi aiki a simulation + real database
- Amma zai rika adana subscribers, vouchers, data usage na gaske

## Voucher System na Gaske:
POST /api/vouchers/generate {plan:"1GB - N300", count:20}
-> Zai baka 20 codes da mutane zasu saya

Client zai shiga http://192.168.0.1 ya saka code, data zai kunna masa ta gaske
