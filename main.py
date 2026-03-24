import tkinter as tk
from tkinter import *
from tkinter import messagebox
from tkinter import ttk as ttk
from PIL import ImageTk,Image
import mlcode
import pandas as pd


#==========================================================================================================================
# Page Close Confirmations (Messagebox):

def homeclose():
    if messagebox.askokcancel('Quit','Do you want to logout and quit?'):
        home.destroy()
        quit()


#==========================================================================================================================
# icon window

icon = tk.Tk()
icon.title('Upgrade')
icon.iconbitmap("icon ICO.ico")
image = Image.open("icon.png")
tk_image = ImageTk.PhotoImage(image)
image_label = tk.Label(icon, image=tk_image)
image_label.pack()
icon.update()
screen_width = icon.winfo_screenwidth()
screen_height = icon.winfo_screenheight()
window_width = 300  
window_height = 300  
x = int((screen_width - window_width) / 2)
y = int((screen_height - window_height) / 2)
icon.geometry("+{}+{}".format(x, y))
icon.after(2000, icon.destroy)
icon.mainloop()
    

#========================================================================================================================== 
#Student Analysis

def findstudent():
       
    fs=tk.Tk()
    fs.iconbitmap("icon ICO.ico")
    fs.title('Upgrade - Find Student recommendation')
    fs.geometry("500x500")
    fs.resizable(False,False)
    fs.configure(bg="lightgreen")

    screen_width = fs.winfo_screenwidth()
    screen_height = fs.winfo_screenheight()
    window_width = 500  
    window_height = 500  
    x = int((screen_width - window_width) / 2)
    y = int((screen_height - window_height) / 2)
    fs.geometry("+{}+{}".format(x, y))
    
    global fsclsid,fscrsid,stdid
    
    Label(fs, text="Class",font=('Arial',14,),bg='green',fg='white', width=20).place(relx=0.05, rely=0.1)
    fsclsid = Entry(fs)
    fsclsid.place(relx=0.6, rely=0.1,height=30,width=180)
    Label(fs, text="Course ID",font=('Arial',14,),bg='green',fg='white', width=20).place(relx=0.05, rely=0.2)
    fscrsid = Entry(fs)
    fscrsid.place(relx=0.6, rely=0.2,height=30,width=180)
    Label(fs, text="Student ID",font=('Arial',14,),bg='green',fg='white', width=20).place(relx=0.05, rely=0.3)
    stdid = Entry(fs)
    stdid.place(relx=0.6, rely=0.3,height=30,width=180)
    
    
    def findstudentrecommendation():
        class_id = fsclsid.get().strip()
        course_id = fscrsid.get().strip()
        student_id = stdid.get().strip()

        if not class_id or not course_id or not student_id:
            messagebox.showerror("Input Error", "Please fill in all the fields")
            return

        try:
            df = pd.read_excel('Students.xlsx', sheet_name=course_id)
            
            result = df[(df['Class'] == class_id) & (df['Student Id'] == int(student_id))]
            
            if result.empty:
                messagebox.showinfo("Not Found", "No such student.")
            else:
                recommendation = result['Recommendation'].values[0]
                if pd.isna(recommendation) or recommendation.strip() == "":
                    messagebox.showinfo("No Recommendation", "No recommendation yet.")
                else:
                    mlcode.findthem(student_id,class_id,course_id)
 
        except FileNotFoundError:
            messagebox.showerror("File Error", "The file 'Students.xlsx' was not found.")
        except ValueError:
            messagebox.showerror("Sheet Error", f"No sheet named '{course_id}' in the file.")
        except Exception as e:
            messagebox.showerror("Error", f"An unexpected error occurred: {str(e)}")

    Button(fs,text='Search',font=('Arial',12,),command=findstudentrecommendation,height=2,width=20,bg='green',
           fg='white',activebackground='Skyblue',activeforeground='thistle1').place(relx=0.5,rely=0.95,anchor=CENTER)   


#========================================================================================================================== 
#Student Analysis

def studentanalysis():
    
    sa=tk.Tk()
    sa.iconbitmap("icon ICO.ico")
    sa.title('Upgrade - Student Analysis')
    sa.geometry("500x500")
    sa.resizable(False,False)
    sa.configure(bg="lightgreen")

    screen_width = sa.winfo_screenwidth()
    screen_height = sa.winfo_screenheight()
    window_width = 500  
    window_height = 500  
    x = int((screen_width - window_width) / 2)
    y = int((screen_height - window_height) / 2)
    sa.geometry("+{}+{}".format(x, y))
    
    #tk.Label(sa, text="Class",font=('Arial',14,),bg='green',fg='white', width=20).place(relx=0.05, rely=0.1)
    #clsid = tk.Entry(sa).place(relx=0.6, rely=0.1,height=30,width=180)
    tk.Label(sa, text="Course ID",font=('Arial',14,),bg='green',fg='white', width=20).place(relx=0.05, rely=0.2)
    crsid = tk.Entry(sa)
    crsid.place(relx=0.6, rely=0.2,height=30,width=180)
    
    l = [crsid]
    
    def call_fun():
        l = [crsid.get()]
        mlcode.student_recommendation(l)

    Button(sa,text='Recommendation',font=('Arial',12,),command=call_fun,height=2,width=20,bg='green',
           fg='white',activebackground='Skyblue',activeforeground='thistle1').place(relx=0.5,rely=0.95,anchor=CENTER)


#========================================================================================================================== 
#Class Analysis

def classanalysis():
    
    ca=tk.Tk()
    ca.iconbitmap("icon ICO.ico")
    ca.title('Upgrade - Student Analysis')
    ca.geometry("500x500")
    ca.resizable(False,False)
    ca.configure(bg="lightgreen")

    screen_width = ca.winfo_screenwidth()
    screen_height = ca.winfo_screenheight()
    window_width = 500  
    window_height = 500  
    x = int((screen_width - window_width) / 2)
    y = int((screen_height - window_height) / 2)
    ca.geometry("+{}+{}".format(x, y))
    
    tk.Label(ca, text="Class",font=('Arial',14,),bg='green',fg='white', width=20).place(relx=0.05, rely=0.1)
    cls = Entry(ca)
    cls.place(relx=0.6, rely=0.1,height=30,width=180)
    tk.Label(ca, text="Course ID",font=('Arial',14,),bg='green',fg='white', width=20).place(relx=0.05, rely=0.2)
    crs = Entry(ca)
    crs.place(relx=0.6, rely=0.2,height=30,width=180)

    def call_fun():
        l = [cls.get(),crs.get()]
        mlcode.class_recommendation(l)

    Button(ca,text='Recommendation',font=('Arial',14,),command=call_fun,height=2,width=20,bg='green',
           fg='white',activebackground='Skyblue',activeforeground='thistle1').place(relx=0.5,rely=0.9,anchor=CENTER)
    
    


#==========================================================================================================================
# Home Page:

home=tk.Tk()
home.iconbitmap("icon ICO.ico")
home.title('Upgrade')
home.geometry("500x500")
home.resizable(False,False)
home.configure(bg="lightgreen")
home.protocol('WM_DELETE_WINDOW',homeclose)

screen_width = home.winfo_screenwidth()
screen_height = home.winfo_screenheight()
window_width = 500  
window_height = 500  
x = int((screen_width - window_width) / 2)
y = int((screen_height - window_height) / 2)
home.geometry("+{}+{}".format(x, y))

Button(home,text='Find Student',font=('Arial',14,),command=findstudent,height=2,width=20,bg='green',
       fg='white',activebackground='Skyblue',activeforeground='thistle1').place(relx=0.5,rely=0.4,anchor=CENTER)
Button(home,text='Student Analysis',font=('Arial',14,),command=studentanalysis,height=2,width=20,bg='green',
       fg='white',activebackground='Skyblue',activeforeground='thistle1').place(relx=0.5,rely=0.6,anchor=CENTER)
Button(home,text='Class Analysis',font=('Arial',14,),command=classanalysis,height=2,width=20,bg='green',
       fg='white',activebackground='Skyblue',activeforeground='thistle1').place(relx=0.5,rely=0.8,anchor=CENTER)

home.mainloop()



