import Image from "next/image";
import {defineField, defineType} from 'sanity'

export const userType = defineType({
  name: 'user',
  title: 'User',
  type: 'document',
  fields: [
    defineField({
      name: 'firstName',
      type: 'string',
      title: 'First Name',
    }),
    defineField({
      name: 'lastName',
      type: 'string',
      title: 'Last Name',
    }),
    defineField({
      name: 'email',
      title: 'Email',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'clerkId',
      title: 'Clerk User ID',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'imageUrl',
      type: 'url',
      title: 'ProfileImageURL',
    }),
  ],
  preview: {
    select: {
      firstName: "firstName",
      lastName: "lastName",
      imageUrl: "imageUrl",
    },
    prepare({ firstName, lastName, imageUrl }) {
      return {
        title: `${firstName ? firstName.charAt(0).toUpperCase() + firstName.slice(1) : ''} ${lastName ? lastName.charAt(0).toUpperCase() + lastName.slice(1) : ''}`.trim(),
        media: imageUrl ? <img src={imageUrl} alt={`${firstName} ${lastName}`} style={{width: '100%', height: '100%', objectFit: 'cover'}} /> : null,
      };
    },
  },
});
