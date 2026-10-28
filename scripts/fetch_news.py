#!/usr/bin/env python3
"""Fetch public RSS titles for the CattleCare demo website.
News coverage ≠ confirmed outbreak. Display links and metadata only.
"""
import datetime as dt
import email.utils
import json
import pathlib
import re
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/"news.json"
REGIONS=[
 "서울특별시","부산광역시","대구광역시","인천광역시","광주광역시",
 "대전광역시","울산광역시","세종특별자치시","경기도","강원특별자치도",
 "충청북도","충청남도","전북특별자치도","전라남도","경상북도",
 "경상남도","제주특별자치도"]
CATTLE=re.compile(r"소\b|소고기|쇠고기|한우|육우|젖소|축우|낙농|송아지|구제역|럼피스킨|소 결핵|브루셀라")
DISEASE=re.compile(r"구제역|럼피스킨|브루셀라|소 결핵|가축전염병")
def get_items(query,region):
    q=urllib.parse.urlencode({"q":query+" when:14d","hl":"ko","gl":"KR","ceid":"KR:ko"})
    url="https://news.google.com/rss/search?"+q
    req=urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0 CattleCareEducationalNewsFeed/1.0"})
    with urllib.request.urlopen(req,timeout=22) as resp:
        xml=resp.read(1_600_000)
    root=ET.fromstring(xml)
    output=[]
    for item in root.findall(".//item")[:45]:
        title=(item.findtext("title") or "").strip()
        link=(item.findtext("link") or "").strip()
        pub=(item.findtext("pubDate") or "").strip()
        source=item.find("source")
        publisher=(source.text or "").strip() if source is not None else ""
        if not title or not link.startswith("https://") or not CATTLE.search(title):
            continue
        try:
            published=email.utils.parsedate_to_datetime(pub).astimezone(dt.timezone.utc).isoformat(timespec="seconds")
        except Exception:
            published=""
        output.append(dict(title=title,url=link,publisher=publisher,published=published,region=region,category="disease" if DISEASE.search(title) else "general"))
    return output
def main():
    queries=[("전국","소 한우 육우 낙농 구제역 럼피스킨"),("전국","site:chuksannews.co.kr 한우 소 구제역 럼피스킨")]
    queries += [(r,r+" (한우 OR 소 OR 구제역 OR 럼피스킨 OR 젖소)") for r in REGIONS]
    results=[]
    for region,query in queries:
        try:
            items=get_items(query,region)
            results.extend(items)
            print(region,len(items))
        except Exception as ex:
            print("Feed unavailable for",region,type(ex).__name__,str(ex)[:100])
        time.sleep(0.25)
    unique={}
    for x in sorted(results,key=lambda z:z.get("published",""),reverse=True):
        if x["title"] not in unique:unique[x["title"]]=x
    current=dict(updated_at=dt.datetime.now(dt.timezone.utc).isoformat(timespec="minutes"),articles=list(unique.values())[:350],method="Public Google News RSS search; cattle keyword filtering. Not an official disease alert.")
    if not current["articles"] and OUT.exists():
        print("No current articles retrieved; keeping previous data")
        return
    OUT.write_text(json.dumps(current,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print("Total",len(current["articles"]))
if __name__=="__main__":main()
