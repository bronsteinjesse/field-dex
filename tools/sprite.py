# Game Boy Color style sprite from a cut-out bird photo: 44x44, a few colors, dark outline.
import cv2, numpy as np
from sklearn.cluster import KMeans
def sat(rgb,k=1.35,v=1.08):
    h=cv2.cvtColor(np.clip(rgb,0,255).astype(np.uint8),cv2.COLOR_BGR2HSV).astype(np.float32); h[...,1]=np.clip(h[...,1]*k,0,255); h[...,2]=np.clip(h[...,2]*v,0,255)
    return cv2.cvtColor(h.astype(np.uint8),cv2.COLOR_HSV2BGR).astype(np.float32)
def sprite(path, px=40, k=4):
    im=cv2.imread(path,cv2.IMREAD_UNCHANGED); rgb=sat(im[...,:3].astype(np.float32)); a=im[...,3]
    ys,xs=np.where(a>110); rgb=rgb[ys.min():ys.max()+1, xs.min():xs.max()+1]; a=a[ys.min():ys.max()+1, xs.min():xs.max()+1]
    h,w=a.shape; s=px/max(h,w); sw,sh=max(1,round(w*s)),max(1,round(h*s))
    small=cv2.resize(rgb,(sw,sh),interpolation=cv2.INTER_AREA); sa=cv2.resize(a,(sw,sh),interpolation=cv2.INTER_AREA)>110
    # drop stray specks: keep the biggest blob and anything sizable
    n,lab,st,_=cv2.connectedComponentsWithStats(sa.astype(np.uint8)); keep=np.zeros_like(sa)
    big=st[1:,4].max() if n>1 else 0
    for i in range(1,n):
        if st[i,4]>=max(6,big*0.05): keep|=lab==i
    sa=keep
    px_=small[sa]; km=KMeans(k,n_init=3,random_state=0).fit(px_)
    q=small.copy(); q[sa]=km.cluster_centers_[km.predict(px_)]
    S=44; canvas=np.zeros((S,S,3),np.float32); ca=np.zeros((S,S),bool)
    oy=S-2-sh if sh<S-4 else 2; oy=max(2,min(oy,(S-sh)//2+4)); ox=(S-sw)//2
    canvas[oy:oy+sh,ox:ox+sw]=q; ca[oy:oy+sh,ox:ox+sw]=sa
    edge=cv2.dilate(ca.astype(np.uint8),np.ones((3,3),np.uint8)).astype(bool)&~ca
    canvas[edge]=[27,20,16]
    return np.dstack([np.clip(canvas,0,255).astype(np.uint8),((ca|edge)*255).astype(np.uint8)])
