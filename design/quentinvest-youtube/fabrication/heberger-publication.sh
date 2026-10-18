#!/bin/sh
# usage : heberger.sh NN dossier-episode   -> compresse, pousse sur la branche temporaire, vérifie les adresses
S=/tmp/claude-0/-home-user/8062cfbc-05c1-578b-a502-ec982a91baef/scratchpad; N=$1; D=$2; B=$(basename $D)
cd $S/medias && git checkout -q -B "h$N" 5e7cf3aa55ff05480de55e571ff8636de2cee43c
ffmpeg -y -v error -i $D/$B-youtube.mp4 -c:v libx264 -crf 24 -preset medium -maxrate 3M -bufsize 6M -c:a aac -b:a 128k -movflags +faststart $N-youtube.mp4
cp $D/$B-tiktok.mp4 $N-tiktok.mp4; cp $D/$N-miniature.png $N-miniature.png
git add -A && git commit -q -m "Médias épisode $N" && git push -f origin HEAD:medias-publication 2>&1 | tail -1
sleep 4; for f in $N-youtube.mp4 $N-tiktok.mp4 $N-miniature.png; do curl -s -o /dev/null -w "$f %{http_code}\n" -m 30 https://raw.githubusercontent.com/ikeupods-del/Quentools/medias-publication/$f; done
for f in $N-youtube.mp4 $N-tiktok.mp4; do echo $f $(ffprobe -v error -show_entries format=duration -of csv=p=0 $f); done
python3 - <<PY
import json
d=json.load(open('$D/$B-publication.json'))
print(json.dumps({'yt':d['descriptionYoutube'],'tt':d['legendeTikTok'],'titre':d['titre'],'tags':d['tagsYoutube']},ensure_ascii=False))
PY
