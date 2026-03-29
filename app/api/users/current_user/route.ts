import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import { verifyToken } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    await connectDB();
    
    const auth = verifyToken(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await User.findById(auth.id).select('-password');
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    console.error('Error fetching current user:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await connectDB();
    
    const auth = verifyToken(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const deletedUser = await User.findByIdAndDelete(auth.id);
    
    if (!deletedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'User deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    await connectDB();
    const auth = verifyToken(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { username, bio, avatar } = body;

    const currentUser = await User.findById(auth.id);
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (username && username !== currentUser.username) {
      const existingUser = await User.findOne({ 
        username: { $regex: new RegExp(`^${username}$`, 'i') } 
      });

      if (existingUser) {
        return NextResponse.json(
          { error: 'Username is already taken by another user.' },
          { status: 400 }
        );
      }
      
      currentUser.username = username;
    }

    if (bio !== undefined) currentUser.bio = bio;
    if (avatar !== undefined) currentUser.avatar = avatar;

    await currentUser.save();
    
    return NextResponse.json({ 
        message: 'Profile updated successfully',
        user: {
            _id: currentUser._id,
            username: currentUser.username,
            email: currentUser.email,
            bio: currentUser.bio,
            avatar: currentUser.avatar,
            readReceipts: currentUser.readReceipts,
            theme: currentUser.theme,
            twoFactorEnabled: currentUser.twoFactorEnabled
        }
    });

  } catch (error: any) {
    console.error('Update Profile Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}