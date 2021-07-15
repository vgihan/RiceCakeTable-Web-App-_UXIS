"""
Moments

Image Moment는 대상을 구분할 수 있는 특징을 의미합니다..
특징으로는 Area, Perimeter, 중심점 등이 있습니다.
Image Moments는 대상을 구분한 후, 다른 대상과 구분하기 위해
대상을 설명(describe)하는 자료로 사용됩니다.
"""

import cv2
import numpy as np

img = cv2.imread('data/BW01.png')
imgray = cv2.cvtColor(img,cv2.COLOR_BGR2GRAY)
ret, thresh = cv2.threshold(imgray,127,255,0)

contours, hierachy = cv2.findContours(thresh, cv2.RETR_TREE,cv2.CHAIN_APPROX_SIMPLE)

# 첫번째 contours의 moment 특징 추출
cnt = contours[0]
print("cnt=", cnt)

M = cv2.moments(cnt)

# 중심값을 찾아보자
cx = int(M['m10']/M['m00'])
cy = int(M['m01']/M['m00'])

print(f"중심점은 = {cx, cy}")
myarea = cv2.contourArea(cnt)
print(f"면적은 = { myarea }")


for w in M.items():
    print(w)

cv2.imshow('image',img)
cv2.waitKey(0)
cv2.destroyAllWindows()